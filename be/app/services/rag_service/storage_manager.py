import logging
from typing import List, Optional
import psycopg2
from urllib.parse import urlparse

from llama_index.core import (
    Settings,
    VectorStoreIndex,
    StorageContext,
)
from llama_index.core.schema import BaseNode
from llama_index.core.node_parser import get_leaf_nodes
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.storage.docstore.postgres import PostgresDocumentStore
from llama_index.storage.index_store.postgres import PostgresIndexStore

import qdrant_client

from app.core.config import settings
from app.core.model_manager import model_manager


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorStorageManager:
    """
    Base manager for vector storage operations including connection checking,
    data storage, and index creation.
    """
    
    def __init__(
        self, 
        qdrant_url: str = None, 
        qdrant_api_key: str = None, 
        collection_name: str = settings.QDRANT_COLLECTION_NAME,
        index_id: str = settings.QDRANT_INDEX_ID,
        postgres_url: str = None
    ):
        """
        Initialize storage manager for vector database operations.
        
        Args:
            qdrant_url: Qdrant server URL
            qdrant_api_key: Qdrant API key for cloud
            collection_name: Name of the collection in Qdrant
            index_id: Unique identifier for the index
            postgres_url: PostgreSQL connection URL
        """
        self.collection_name = collection_name
        self.index_id = index_id
        self.index = None
        self.storage_context = None

        # PostgreSQL URL
        self.postgres_url = postgres_url or settings.POSTGRES_URL

        # Setting Qdrant client
        qdrant_url = qdrant_url or settings.QDRANT_URL
        qdrant_api_key = qdrant_api_key or settings.QDRANT_API_KEY
        self.qdrant_client = self._setup_qdrant_client(qdrant_url, qdrant_api_key)

        # Initialize LLM and Embedding model
        self.llm = model_manager.get_llm_langchain_instance()
        self.embed_model = model_manager.get_embedding_instance()

        Settings.llm = self.llm
        Settings.embed_model = self.embed_model

        # Check connections
        self._check_connections()

    def _setup_qdrant_client(self, qdrant_url: Optional[str] = None, qdrant_api_key: Optional[str] = None):
        """Setup Qdrant client"""
        logger.debug("Setting up Qdrant client...")
        
        if qdrant_url and qdrant_api_key:
            client = qdrant_client.QdrantClient(
                url=qdrant_url,
                api_key=qdrant_api_key,
                timeout=60
            )
            logger.debug("Connected to Qdrant Cloud")
        else:
            logger.warning("Can't connect to Qdrant Cloud")
            
        return client

    def _check_connections(self):
        """Check connections to Qdrant and PostgreSQL services"""
        logger.debug("Checking connections...")
    
        # Check Qdrant
        try:
            collections = self.qdrant_client.get_collections()
            logger.debug(f"Qdrant connection OK - {len(collections.collections)} collections")
        except Exception as e:
            logger.error(f"Qdrant connection failed: {e}")

        # Check PostgreSQL
        try:            
            parsed = urlparse(self.postgres_url)
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port,
                database=parsed.path[1:],
                user=parsed.username,
                password=parsed.password
            )
            conn.close()
            logger.debug("PostgreSQL connection OK")
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")

    def _setup_stores(self):
        """
        Sets up Qdrant Vector Store, PostgreSQL DocStore, and IndexStore.
        """
        # Setup Qdrant Vector Store
        vector_store = QdrantVectorStore(
            client=self.qdrant_client,
            collection_name=self.collection_name
        )

        # Setup PostgreSQL DocStore and IndexStore using URI
        docstore = PostgresDocumentStore.from_uri(uri=self.postgres_url)
        index_store = PostgresIndexStore.from_uri(uri=self.postgres_url)

        return vector_store, docstore, index_store

    def _prepare_metadata_nodes(self, nodes: List[BaseNode]) -> List[BaseNode]:
        """
        Applies custom templates and metadata exclusions to nodes before indexing.
        This controls exactly what the LLM and Embedding models will process.
        """
        keys_to_excluded = ["file_path"]

        for node in nodes:
            node.text_template = "Metadata:\n{metadata_str}\n-----\nContent:\n{content}"
            node.metadata_seperator = "\n"

            exclusion_lists = [
                node.excluded_llm_metadata_keys,
                node.excluded_embed_metadata_keys
            ]

            # Exclude metadata being seen by the LLM and EMBED
            for lst in exclusion_lists:
                for key in keys_to_excluded:
                    if key not in lst:
                        lst.append(key)

        return nodes

    def add_nodes_to_db(self, nodes: List[BaseNode], insert_batch_size: int = 20):
        """
        Add nodes to PostgreSQL and Qdrant vector store.
        """
        if not nodes:
            raise ValueError("No nodes provided.")
        
        # Create Storage Context
        vector_store, docstore, index_store = self._setup_stores()

        self.storage_context = StorageContext.from_defaults(
            docstore=docstore,
            index_store=index_store,
            vector_store=vector_store
        )

        logger.info(f"Adding {len(nodes)} nodes to the stores.")
        docstore.add_documents(nodes)

        prepared_nodes = get_leaf_nodes(nodes)
        leaf_nodes = self._prepare_metadata_nodes(prepared_nodes)

        self.index = VectorStoreIndex(
            nodes=leaf_nodes,
            storage_context=self.storage_context,
            insert_batch_size=insert_batch_size,
            show_progress=True
        )

        self.index.set_index_id(self.index_id)
        logger.info(f"Successfully added nodes to database with index_id: {self.index_id}")

        return self.index