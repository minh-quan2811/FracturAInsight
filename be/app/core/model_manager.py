from langchain_google_genai import ChatGoogleGenerativeAI
# from llama_index.embeddings.cohere import CohereEmbedding
from llama_index.postprocessor.cohere_rerank import CohereRerank
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from app.core.config import settings

class ModelManager:
    def __init__(self):
        pass

    # def get_embedding_instance(self):
    #     """
    #     Get Cohere embedding model instance.
    #     """
    #     return CohereEmbedding(
    #         api_key=settings.COHERE_API_KEY,
    #         model_name="embed-english-v3.0",
    #         max_tokens=60000
    #     )
    
    def get_embedding_instance(self):
        """
        Get HuggingFace embedding model instance.
        """
        return HuggingFaceEmbedding(
            model_name=settings.EMBEDDING_MODEL_NAME,
            max_length=512
        )

    def get_llm_langchain_instance(self):
        """
        Get LangChain LLM instance (Google Gemini).
        """
        return ChatGoogleGenerativeAI(
            google_api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL_NAME,
            temperature=0.7,
            max_retries=2,
            timeout=30,
        )

    def get_summarization_llm(self):
        """
        Cheap/fast LLM instance used by the agent memory system to:
          - compress an agent reply into a 1-2 sentence summary before it
            enters the Redis raw buffer, and
          - merge/compress session summaries for the Postgres buffer.
        """
        return ChatGoogleGenerativeAI(
            google_api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL_NAME,
            temperature=0.2,
            max_retries=2,
            timeout=30,
        )

    def get_model_rerank(self):
        """
        Get Cohere rerank model instance.
        """
        return CohereRerank(
            api_key=settings.COHERE_API_KEY,
            top_n=3,
            model=settings.COHERE_RERANK_MODEL_NAME
        )

model_manager = ModelManager()