import sqlite3
import numpy as np

from database.db import get_db_connection
from services.embedding_service import create_embeddings


def generate_document_embeddings(document_id):
    """
    Generate and store embeddings for all chunks
    belonging to a document.
    """

    connection = get_db_connection()
    cursor = connection.cursor()

    # Get all chunks for this document
    cursor.execute("""
        SELECT id, text
        FROM chunks
        WHERE document_id = ?
        ORDER BY id
    """, (document_id,))

    chunks = cursor.fetchall()

    if not chunks:
        connection.close()
        return 0

    texts = [chunk["text"] for chunk in chunks]

    # Generate embeddings
    embeddings = create_embeddings(texts)

    stored_count = 0

    for chunk, embedding in zip(chunks, embeddings):

        vector_bytes = embedding.astype(
            np.float32
        ).tobytes()

        cursor.execute("""
            INSERT OR REPLACE INTO embeddings (
                chunk_id,
                vector
            )
            VALUES (?, ?)
        """, (
            chunk["id"],
            sqlite3.Binary(vector_bytes)
        ))

        stored_count += 1

    connection.commit()
    connection.close()

    return stored_count