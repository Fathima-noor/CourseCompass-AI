import os
import time
import logging
from functools import lru_cache
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "courses.csv"
ENV_PATH = BASE_DIR / ".env"

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def load_course_data():
    """Load and validate the course CSV once."""

    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Course dataset not found: {CSV_PATH}"
        )

    df = pd.read_csv(CSV_PATH).fillna("")

    required_columns = [
        "course_name",
        "field",
        "level",
        "duration",
        "fees",
        "eligibility",
        "skills",
        "career_options",
        "description",
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing CSV columns: {', '.join(missing)}"
        )

    if df.empty:
        raise ValueError("The course dataset is empty.")

    return df


@lru_cache(maxsize=1)
def load_rag_components():
    """Initialize embeddings, FAISS and Gemini once."""
    from dotenv import load_dotenv
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
    from langchain_core.documents import Document
    from langchain_google_genai import ChatGoogleGenerativeAI

    load_dotenv(ENV_PATH)

    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY is missing from the .env file."
        )

    df = load_course_data()
    documents = []

    for _, row in df.iterrows():
        content = f"""
Course Name: {row['course_name']}
Field: {row['field']}
Level: {row['level']}
Duration: {row['duration']}
Fees: {row['fees']} INR
Eligibility: {row['eligibility']}
Skills: {row['skills']}
Career Options: {row['career_options']}
Description: {row['description']}
"""

        documents.append(
            Document(
                page_content=content.strip(),
                metadata={
                    "course_name": str(row["course_name"])
                },
            )
        )

    print("Loading Hugging Face embedding model...", flush=True)

    start = time.perf_counter()

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    print(
        f"Embedding model loaded in "
        f"{time.perf_counter() - start:.2f} seconds.",
        flush=True,
    )

    print("Creating FAISS vector database...", flush=True)

    start = time.perf_counter()

    vector_store = FAISS.from_documents(
        documents,
        embeddings,
    )

    print(
        f"FAISS database created in "
        f"{time.perf_counter() - start:.2f} seconds.",
        flush=True,
    )

    retriever = vector_store.as_retriever(
        search_kwargs={"k": min(4, len(documents))}
    )

    print("Initializing Gemini model...", flush=True)

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.8-flash",
        google_api_key=api_key,
        temperature=0.2,
        timeout=60_000,  # Google GenAI HTTP timeout is in milliseconds.
        max_retries=1,  # The SDK counts this as one total attempt.
    )

    print("RAG components initialized successfully.", flush=True)

    return retriever, llm


def get_course_recommendation(question):
    """Generate a course recommendation using RAG."""

    if not isinstance(question, str) or not question.strip():
        return "Please enter a question about courses."

    question = question.strip()

    retriever, llm = load_rag_components()
    from langchain_core.prompts import ChatPromptTemplate

    print("Searching relevant courses...", flush=True)

    start = time.perf_counter()

    relevant_documents = retriever.invoke(question)

    print(
        f"Course search completed in "
        f"{time.perf_counter() - start:.2f} seconds.",
        flush=True,
    )

    context = "\n\n".join(
        document.page_content
        for document in relevant_documents
    )

    if not context.strip():
        return (
            "I could not find relevant courses. "
            "Please ask about a course or career goal."
        )

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """
You are CourseCompass AI, a friendly college course
recommendation assistant.

Help students choose suitable courses based on their
education, interests, skills, career goals and budget.

RECOMMENDATION RULES:

1. Recommend up to three relevant courses when appropriate.
2. Explain why each course may suit the student.
3. Include eligibility, duration, fees, skills and career
   options when these details are available.
4. Ask one short follow-up question if important information
   about the student is missing.
5. Do not recommend unrelated courses just to fill the list.

ACCURACY RULES:

6. Use the supplied course data as the source of truth.
7. Never invent course names or course details.
8. If a detail is missing, say it is unavailable in the dataset.
9. Listed fees are sample values, not verified official fees.
   Tell students to confirm fees with the institution.
10. Do not guarantee admission, employment or salary.
11. Do not claim to have checked external websites.
12. If no suitable course is available, explain this honestly.

CONVERSATION RULES:

13. Use simple, friendly language.
14. Answer in the same language as the student's question.
15. Use headings and bullet points when helpful.
16. For unrelated questions, politely guide the student
    back to course and career recommendations.

COURSE DATA:
{context}
""",
            ),
            ("human", "{question}"),
        ]
    )

    print("Waiting for Gemini response...", flush=True)

    start = time.perf_counter()

    try:
        messages = prompt.format_messages(
            context=context,
            question=question,
        )

        response = llm.invoke(messages)

    except Exception:
        logger.exception(
            "Gemini request failed after %.2f seconds.",
            time.perf_counter() - start,
        )
        raise

    print(
        f"Gemini response received in "
        f"{time.perf_counter() - start:.2f} seconds.",
        flush=True,
    )

    content = response.content

    if isinstance(content, str):
        answer = content.strip()

        if answer:
            return answer

    if isinstance(content, list):
        text_parts = []

        for item in content:
            if isinstance(item, str):
                text_parts.append(item)

            elif isinstance(item, dict) and item.get("type") == "text":
                text_parts.append(item.get("text", ""))

        answer = "\n".join(text_parts).strip()

        if answer:
            return answer

    return (
        "Sorry, I could not generate a readable answer. "
        "Please try again."
    )


def get_all_courses():
    """Return all courses as dictionaries."""

    df = load_course_data()

    return df.to_dict(orient="records")