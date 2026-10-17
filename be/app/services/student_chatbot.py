import os
import time
import asyncio
import logging
from typing import AsyncGenerator, Dict, List, Optional, TypedDict

from langsmith import traceable
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.core.model_manager import model_manager
from app.services.rag_service import VectorRetrievalManager

from app.services.prompts.student_chatbot_prompts import (
    SYSTEM_PROMPT,
    CASUAL_SYSTEM_PROMPT,
    CLASSIFY_PROMPT,
    NO_CONTEXT_MESSAGE,
)

logger = logging.getLogger(__name__)

os.environ["LANGSMITH_TRACING"] = settings.LANGSMITH_TRACING
os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
os.environ["LANGSMITH_PROJECT"] = settings.LANGSMITH_PROJECT


class AgentState(TypedDict):
    question: str
    memory_context: Optional[str]
    needs_rag: bool
    retrieved_nodes: List[object]
    context: str
    answer: str
    error: Optional[str]


class StudentChatbot:

    def __init__(
            self,
            collection_name: str = settings.QDRANT_COLLECTION_NAME,
            index_id: str = settings.QDRANT_INDEX_ID,
            dense_top_k: int = 30,
            sparse_top_k: int = 30,
            rrf_k: int = 60,
            final_top_k: int = 20,
            auto_merge_threshold: float = 0.5,
        ):
            self.llm = model_manager.get_llm_langchain_instance()
            self.retrieval_manager = VectorRetrievalManager(
                collection_name=collection_name,
                index_id=index_id,
            )

            self.dense_top_k = dense_top_k
            self.sparse_top_k = sparse_top_k
            self.rrf_k = rrf_k
            self.final_top_k = final_top_k
            self.auto_merge_threshold = auto_merge_threshold

            self.graph = self._build_graph()
            logger.info("StudentChatbot (LangGraph) initialized")

    def warmup(self, retries: int = 3, delay: float = 3.0):
        """Pre-load the index and BM25 corpus so the first RAG query isn't slow.
        """
        import time

        for attempt in range(1, retries + 1):
            try:
                self.retrieval_manager._load_index()
                self.retrieval_manager._ensure_bm25_index()
                logger.info("Retrieval warmup complete")
                return
            except Exception:
                logger.warning(
                    f"Retrieval warmup failed (attempt {attempt}/{retries})", exc_info=True
                )
                # Drop any half-initialised state so the next attempt starts clean
                self.retrieval_manager.index = None
                self.retrieval_manager.storage_context = None
                if attempt < retries:
                    time.sleep(delay)

    @traceable(name="classify_question", run_type="chain")
    def _classify_node(self, state: AgentState) -> dict:
        question = state["question"]

        prompt = CLASSIFY_PROMPT.format(question=question)

        try:
            response = self._invoke_llm(prompt)
            label = response.content.strip().upper() if hasattr(response, "content") else str(response).strip().upper()
            needs_rag = label.startswith("RAG")
        except Exception as e:
            # If classification fails, default to RAG so we don't lose answers
            logger.warning(f"Classification failed, defaulting to RAG: {e}")
            needs_rag = True

        logger.info(f"Question classified — needs_rag={needs_rag} | question='{question[:80]}'")
        return {"needs_rag": needs_rag}

    @staticmethod
    def _route_after_classify(state: AgentState) -> str:
        return "retrieve" if state["needs_rag"] else "generate"

    @traceable(name="retrieve_context", run_type="retriever")
    def _retrieve_node(self, state: AgentState) -> dict:
        question = state["question"]
        try:
            nodes = self.retrieval_manager.retrieve_hybrid(
                question,
                dense_top_k=self.dense_top_k,
                sparse_top_k=self.sparse_top_k,
                rrf_k=self.rrf_k,
                final_top_k=self.final_top_k,
                auto_merge_threshold=self.auto_merge_threshold,
            )
        except Exception as e:
            # Fallback: answer without documents instead of showing a raw error
            logger.error(f"Retrieval failed, answering without documents: {e}")
            return {"retrieved_nodes": [], "context": "", "error": None}

        context = self._format_context(nodes)
        return {"retrieved_nodes": nodes, "context": context, "error": None}

    @staticmethod
    def _build_prompt(state: AgentState) -> str:
        question = state["question"]

        # Casual question: skip RAG context entirely
        if not state.get("needs_rag", True):
            return (
                f"{CASUAL_SYSTEM_PROMPT}\n\n"
                f"Student message: {question}\n\n"
                f"Response:"
            )

        context = state.get("context") or ""
        memory_context = state.get("memory_context")
        context_block = context if context.strip() else NO_CONTEXT_MESSAGE
        memory_block = f"{memory_context}\n\n" if memory_context else ""

        return (
            f"{SYSTEM_PROMPT}\n\n"
            f"{memory_block}"
            f"Retrieved Context:\n{context_block}\n\n"
            f"Student Question: {question}\n\n"
            f"Answer:"
        )

    @traceable(name="generate_answer", run_type="chain")
    def _generate_node(self, state: AgentState) -> dict:
        if state.get("error"):
            return {"answer": f"I ran into an issue retrieving information: {state['error']}. Please try again."}

        prompt = self._build_prompt(state)

        try:
            response = self._invoke_llm(prompt)
            answer = response.content if hasattr(response, "content") else str(response)
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            answer = f"I apologize, but I encountered an error generating a response: {e}. Please try again."

        return {"answer": answer}

    @traceable(name="llm_call", run_type="llm")
    def _invoke_llm(self, prompt: str):
        return self.llm.invoke(prompt)

    @staticmethod
    def _format_context(nodes: List[object]) -> str:
        if not nodes:
            return ""

        chunks = []
        for i, node_with_score in enumerate(nodes, start=1):
            node = getattr(node_with_score, "node", node_with_score)
            text = node.get_content() if hasattr(node, "get_content") else str(node)
            metadata = getattr(node, "metadata", {}) or {}
            source = metadata.get("file_name") or metadata.get("file_path") or "unknown source"
            score = getattr(node_with_score, "score", None)
            score_str = f", relevance: {score:.2f}" if isinstance(score, float) else ""
            chunks.append(f"[Chunk {i} | Source: {source}{score_str}]\n{text}")

        return "\n\n---\n\n".join(chunks)

    def _build_graph(self):
        builder = StateGraph(AgentState)

        builder.add_node("classify", self._classify_node)
        builder.add_node("retrieve", self._retrieve_node)
        builder.add_node("generate", self._generate_node)

        builder.add_edge(START, "classify")
        builder.add_conditional_edges(
            "classify",
            self._route_after_classify,
            {"retrieve": "retrieve", "generate": "generate"},
        )
        builder.add_edge("retrieve", "generate")
        builder.add_edge("generate", END)

        return builder.compile()

    async def astream(
        self, user_message: str, memory_context: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, str], None]:
        """Async generator for SSE streaming."""
        state: AgentState = {
            "question": user_message,
            "memory_context": memory_context,
            "needs_rag": True,
            "retrieved_nodes": [],
            "context": "",
            "answer": "",
            "error": None,
        }

        t0 = time.perf_counter()
        yield {"type": "node", "node": "classify"}

        # Start the classifier and the search together for every question
        classify_task = asyncio.create_task(asyncio.to_thread(self._classify_node, state))
        retrieve_task = asyncio.create_task(asyncio.to_thread(self._retrieve_node, state))

        state.update(await classify_task)

        # Use the search result only when the question needs it
        if state["needs_rag"]:
            yield {"type": "node", "node": "retrieve"}
            state.update(await retrieve_task)

        logger.info("TIMING classify_retrieve=%.2fs", time.perf_counter() - t0)

        yield {"type": "node", "node": "generate"}

        prompt = self._build_prompt(state)

        try:
            t_gen = time.perf_counter()
            first = True
            async for chunk in self.llm.astream(prompt):
                piece = chunk.content if hasattr(chunk, "content") else str(chunk)
                if piece:
                    if first:
                        logger.info("TIMING first_token=%.2fs after generate start", time.perf_counter() - t_gen)
                        first = False
                    yield {"type": "token", "content": piece}
            logger.info("TIMING generate_total=%.2fs", time.perf_counter() - t_gen)
        except Exception as e:
            logger.error(f"LLM streaming failed: {e}")
            err_msg = (
                f"I apologize, but I encountered an error generating a response: "
                f"{e}. Please try again."
            )
            yield {"type": "token", "content": err_msg}


chatbot = StudentChatbot()