import logging
import time
from typing import List

import numpy as np
from rank_bm25 import BM25Okapi

from llama_index.core import (
    StorageContext,
    load_index_from_storage,
)
from llama_index.core import QueryBundle
from llama_index.core.retrievers import BaseRetriever, AutoMergingRetriever
from llama_index.core.node_parser import get_leaf_nodes
from llama_index.core.schema import NodeWithScore

from app.core.model_manager import model_manager
from .storage_manager import VectorStorageManager


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _log_nodes(label: str, nodes: List[NodeWithScore], limit: int = 5) -> None:
    """Debug helper: log a preview of a ranked node list at any pipeline stage."""
    logger.info(f"[{label}] {len(nodes)} node(s)")
    for i, nws in enumerate(nodes[:limit], start=1):
        node = nws.node if hasattr(nws, "node") else nws
        score = getattr(nws, "score", None)
        preview = node.get_content()[:80].replace("\n", " ")
        logger.debug(f"  [{label} #{i}] id={node.node_id} score={score} preview={preview!r}")


def reciprocal_rank_fusion(
    ranked_lists: List[List[NodeWithScore]],
    rrf_k: int = 60,
    top_k: int = 20,
) -> List[NodeWithScore]:
    """
    Fuse multiple ranked node lists (e.g. dense + sparse) into one ranked list
    using Reciprocal Rank Fusion. Matches nodes by node_id, sums 1/(rrf_k + rank)
    across every list a node appears in, and removes duplicates.
    """
    rrf_scores = {}
    node_lookup = {}

    for ranked_list in ranked_lists:
        for rank, nws in enumerate(ranked_list):
            node_id = nws.node.node_id
            rrf_scores[node_id] = rrf_scores.get(node_id, 0.0) + 1.0 / (rrf_k + rank + 1)
            node_lookup.setdefault(node_id, nws)

    fused_ids = sorted(rrf_scores, key=lambda nid: rrf_scores[nid], reverse=True)[:top_k]
    return [
        NodeWithScore(node=node_lookup[node_id].node, score=rrf_scores[node_id])
        for node_id in fused_ids
    ]


class HybridFusionRetriever(BaseRetriever):
    """
    Base retriever for AutoMergingRetriever that performs dense + sparse (BM25)
    search and combines them with Reciprocal Rank Fusion before returning nodes.
    """

    def __init__(
        self,
        manager: "VectorRetrievalManager",
        dense_top_k: int = 30,
        sparse_top_k: int = 30,
        rrf_k: int = 60,
        final_top_k: int = 20,
    ):
        self.manager = manager
        self.dense_top_k = dense_top_k
        self.sparse_top_k = sparse_top_k
        self.rrf_k = rrf_k
        self.final_top_k = final_top_k
        super().__init__()

    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        query_str = query_bundle.query_str

        dense_retriever = self.manager._load_retriever(similarity_top_k=self.dense_top_k)
        dense_results = dense_retriever.retrieve(query_str)
        _log_nodes("Dense search", dense_results)

        sparse_results = self.manager._sparse_retrieve(query_str, self.sparse_top_k)
        _log_nodes("Sparse (BM25) search", sparse_results)

        fused_results = reciprocal_rank_fusion(
            [dense_results, sparse_results],
            rrf_k=self.rrf_k,
            top_k=self.final_top_k,
        )
        _log_nodes("RRF fused", fused_results)

        return fused_results


class VectorRetrievalManager(VectorStorageManager):
    """
    Manages vector retrieval operations including loading indices
    and performing similarity search with reranking.
    Inherits from VectorStorageManager to reuse connection setup.
    """
    
    def __init__(self, *args, **kwargs):
        """
        Initialize retrieval manager for vector database queries.
        Inherits all initialization from VectorStorageManager.
        """
        # Call parent constructor to setup all connections
        super().__init__(*args, **kwargs)
        
        # Initialize reranker for retrieval operations
        self.reranker = model_manager.get_model_rerank()

        # Lazily-built BM25 sparse index cache (built on first hybrid search call)
        self._bm25_index = None
        self._bm25_nodes = None

        # Skip retrieval for a short time after a failure
        self._unavailable_until = 0.0

        logger.info("VectorRetrievalManager initialized with reranker")

    KB_RETRY_SECONDS = 30

    def _mark_unavailable(self, reason: Exception) -> None:
        self._unavailable_until = time.monotonic() + self.KB_RETRY_SECONDS
        # Drop half-loaded state so the next try starts clean
        self.index = None
        self.storage_context = None
        self._bm25_index = None
        self._bm25_nodes = None
        logger.warning(
            f"Knowledge base unavailable, skipping retrieval for "
            f"{self.KB_RETRY_SECONDS}s: {reason}"
        )

    def _get_index(self):
        """Return the loaded index, loading it only the first time."""
        if self.index is None or self.storage_context is None:
            self._load_index()
        return self.index

    def _load_index(self):
        """
        Load the index from existing storage context.
        
        Returns:
            Loaded VectorStoreIndex
        """
        vector_store, docstore, index_store = self._setup_stores()

        self.storage_context = StorageContext.from_defaults(
            docstore=docstore,
            index_store=index_store,
            vector_store=vector_store
        )

        self.index = load_index_from_storage(self.storage_context, index_id=self.index_id)
        logger.info(f"Successfully loaded index: {self.index_id}")
        return self.index
    
    def _load_retriever(self, similarity_top_k: int = 30):
        """
        Load the retriever from the index.
        """
        index = self._get_index()

        retriever = index.as_retriever(
            similarity_top_k=similarity_top_k
        )
        return retriever

    def retrieve_basic(self, query_str: str, similarity_top_k: int = 30):
        """
        Perform basic retrieval without reranking.
        """
        retriever = self._load_retriever(similarity_top_k=similarity_top_k)
        
        logger.info(f"Retrieving documents for query: {query_str[:50]}...")
        retrieved_nodes = retriever.retrieve(query_str)
        logger.info(f"Retrieved {len(retrieved_nodes)} nodes.")
        
        return retrieved_nodes

    def _build_bm25_index(self):
        """
        Build an in-memory BM25 index over the same leaf-level nodes that
        are embedded in the vector index, so dense and sparse search operate
        over the same population of chunks (needed for RRF to make sense).
        """
        if self.storage_context is None:
            self._load_index()

        all_nodes = list(self.storage_context.docstore.docs.values())
        leaf_nodes = get_leaf_nodes(all_nodes)

        if not leaf_nodes:
            # BM25Okapi crashes on an empty corpus, so leave the index empty
            logger.warning("No leaf nodes found, BM25 sparse index is empty")
            self._bm25_nodes = []
            self._bm25_index = None
            return

        logger.info(f"Building BM25 sparse index over {len(leaf_nodes)} leaf nodes")

        tokenized_corpus = [node.get_content().lower().split() for node in leaf_nodes]
        self._bm25_nodes = leaf_nodes
        self._bm25_index = BM25Okapi(tokenized_corpus)

    def _ensure_bm25_index(self):
        if self._bm25_index is None and self._bm25_nodes is None:
            self._build_bm25_index()

    def refresh_bm25_index(self):
        """Force a rebuild of the BM25 sparse index, e.g. after new documents are ingested."""
        self._bm25_index = None
        self._bm25_nodes = None
        self._ensure_bm25_index()

    def _sparse_retrieve(self, query_str: str, sparse_top_k: int = 30) -> List[NodeWithScore]:
        """
        Perform sparse keyword search using BM25 over the leaf-node corpus.
        """
        self._ensure_bm25_index()
        if self._bm25_index is None:
            return []

        tokenized_query = query_str.lower().split()
        scores = self._bm25_index.get_scores(tokenized_query)
        ranked_indices = np.argsort(scores)[::-1][:sparse_top_k]

        results = []
        for idx in ranked_indices:
            score = float(scores[idx])
            if score <= 0:
                continue
            results.append(NodeWithScore(node=self._bm25_nodes[idx], score=score))

        return results

    def retrieve_hybrid(
        self,
        query_str: str,
        dense_top_k: int = 30,
        sparse_top_k: int = 30,
        rrf_k: int = 60,
        final_top_k: int = 20,
        auto_merge_threshold: float = 0.5,
    ) -> List[NodeWithScore]:
        """
        Full hybrid retrieval pipeline:
        Dense search + Sparse (BM25) search -> RRF -> AutoMergingRetriever
        -> existing Cohere reranker -> final context nodes.

        Args:
            query_str: the user's query
            dense_top_k: how many nodes to retrieve from dense vector search
            sparse_top_k: how many nodes to retrieve from BM25 sparse search
            rrf_k: RRF constant (higher = flatter score distribution)
            final_top_k: how many nodes survive the RRF fusion step, before
                auto-merging and reranking
            auto_merge_threshold: fraction of a parent's children that must be
                present in the candidate set before they are merged into the
                parent node (AutoMergingRetriever's simple_ratio_thresh)
        """
        # Fallback 1: we recently found the knowledge base missing. Do not try again yet.
        if time.monotonic() < self._unavailable_until:
            return []

        try:
            self._get_index()

            fusion_retriever = HybridFusionRetriever(
                manager=self,
                dense_top_k=dense_top_k,
                sparse_top_k=sparse_top_k,
                rrf_k=rrf_k,
                final_top_k=final_top_k,
            )

            automerging_retriever = AutoMergingRetriever(
                vector_retriever=fusion_retriever,
                storage_context=self.storage_context,
                simple_ratio_thresh=auto_merge_threshold,
                verbose=True,
            )

            query_bundle = QueryBundle(query_str=query_str)
            merged_nodes = automerging_retriever.retrieve(query_bundle)
            _log_nodes("Auto-merged", merged_nodes)
        except Exception as e:
            # Fallback 2: Qdrant collection missing, index missing, DB down, etc.
            self._mark_unavailable(e)
            return []

        if not merged_nodes:
            logger.warning("No nodes left after auto-merging for the given query.")
            return []

        # Fallback 3: if the reranker fails, use the top merged nodes as they are
        try:
            reranked_nodes = self.reranker.postprocess_nodes(merged_nodes, query_bundle=query_bundle)
        except Exception as e:
            logger.warning(f"Rerank failed, using un-reranked nodes: {e}")
            reranked_nodes = merged_nodes[:3]
        _log_nodes("Final reranked", reranked_nodes)

        return reranked_nodes

    def retrieve_with_rerank(self, query_str: str, similarity_top_k: int = 30):
        """
        Perform retrieval and reranking for a given query string.
        (Legacy dense-only path — kept for backward compatibility. Use
        retrieve_hybrid() for the full dense + sparse + RRF + auto-merge pipeline.)
        """
        self.index = self._load_index()

        retriever = self.index.as_retriever(
            similarity_top_k=similarity_top_k
        )

        logger.info("Retrieving initial documents from vector store...")
        retrieved_nodes = retriever.retrieve(query_str)
        logger.info(f"Retrieved {len(retrieved_nodes)} initial nodes.")

        if not retrieved_nodes:
            logger.warning("No nodes retrieved for the given query.")
            return []

        logger.info("Reranking retrieved documents with Cohere...")
        query_bundle = QueryBundle(query_str=query_str)
        reranked_nodes = self.reranker.postprocess_nodes(
            retrieved_nodes, query_bundle=query_bundle
        )
        logger.info(f"Reranked down to {len(reranked_nodes)} nodes.")

        return reranked_nodes