import re
import numpy as np

from database.db import get_db_connection
from services.embedding_service import create_query_embedding


def tokenize(text):
    """
    Convert text into useful lowercase words.
    """
    return set(
        re.findall(
            r"\b[a-zA-Z]{2,}\b",
            text.lower()
        )
    )


def retrieve_relevant_chunks(
    document_id,
    question,
    top_k=5,
    min_score=0.05
):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            chunks.id,
            chunks.page_number,
            chunks.chunk_index,
            chunks.text,
            embeddings.vector
        FROM chunks
        INNER JOIN embeddings
            ON chunks.id = embeddings.chunk_id
        WHERE chunks.document_id = ?
    """, (document_id,))

    rows = cursor.fetchall()
    connection.close()

    print("DOCUMENT ID:", document_id)
    print("CHUNKS + EMBEDDINGS FOUND:", len(rows))

    if not rows:
        return []

    # --------------------------------------------------
    # 1. Semantic query embedding
    # --------------------------------------------------

    query_embedding = create_query_embedding(question)

    # --------------------------------------------------
    # 2. Tokenize question
    # --------------------------------------------------

    question_words = tokenize(question)

    results = []

    for row in rows:

        chunk_text = row["text"]

        # --------------------------------------------------
        # Semantic similarity
        # --------------------------------------------------

        chunk_embedding = np.frombuffer(
            row["vector"],
            dtype=np.float32
        )

        semantic_score = float(
            np.dot(
                query_embedding,
                chunk_embedding
            )
        )

        # --------------------------------------------------
        # Keyword matching
        # --------------------------------------------------

        chunk_words = tokenize(chunk_text)

        common_words = question_words.intersection(
            chunk_words
        )

        keyword_score = (
            len(common_words) / len(question_words)
            if question_words
            else 0
        )

        # --------------------------------------------------
        # Exact phrase matching
        # --------------------------------------------------

        question_lower = question.lower().strip()
        chunk_lower = chunk_text.lower()

        exact_phrase_score = 0

        if question_lower in chunk_lower:
            exact_phrase_score = 1.0

        # --------------------------------------------------
        # Combined hybrid score
        # --------------------------------------------------

        final_score = (
            0.65 * semantic_score
            + 0.25 * keyword_score
            + 0.10 * exact_phrase_score
        )

        results.append({
            "chunk_id": row["id"],
            "page": row["page_number"],
            "chunk_index": row["chunk_index"],
            "text": chunk_text,
            "score": final_score,
            "semantic_score": semantic_score,
            "keyword_score": keyword_score,
            "exact_phrase_score": exact_phrase_score
        })

    # --------------------------------------------------
    # Sort by hybrid score
    # --------------------------------------------------

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    print(
        "TOP HYBRID RESULTS:",
        [
            {
                "page": r["page"],
                "semantic": round(
                    r["semantic_score"], 3
                ),
                "keyword": round(
                    r["keyword_score"], 3
                ),
                "exact": round(
                    r["exact_phrase_score"], 3
                ),
                "final": round(
                    r["score"], 3
                )
            }
            for r in results[:10]
        ]
    )

    # --------------------------------------------------
    # Minimum score filtering
    # --------------------------------------------------

    filtered_results = [
        result
        for result in results
        if result["score"] >= min_score
    ]

    print(
        "RESULTS ABOVE THRESHOLD:",
        [
            (
                r["page"],
                round(r["score"], 3)
            )
            for r in filtered_results[:10]
        ]
    )

    return filtered_results[:top_k]