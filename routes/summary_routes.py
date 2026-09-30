import json
from datetime import datetime

from flask import Blueprint, jsonify

from database.db import get_db_connection
from services.llm_service import generate_summary


summary_bp = Blueprint(
    "summary",
    __name__,
    url_prefix="/api/documents"
)


@summary_bp.route("/<document_id>/summary", methods=["GET"])
def summary(document_id):

    connection = get_db_connection()
    cursor = connection.cursor()

    # =====================================================
    # 1. CHECK CACHE
    # =====================================================

    cursor.execute("""
        SELECT
            summary,
            key_points,
            entities,
            citations
        FROM document_summaries
        WHERE document_id = ?
    """, (document_id,))

    cached = cursor.fetchone()

    if cached:

        print("SUMMARY CACHE HIT:", document_id)

        connection.close()

        return jsonify({
            "document_id": document_id,
            "summary": cached["summary"],
            "key_points": json.loads(
                cached["key_points"] or "[]"
            ),
            "entities": json.loads(
                cached["entities"] or "[]"
            ),
            "citations": json.loads(
                cached["citations"] or "[]"
            ),
            "cached": True
        }), 200

    # =====================================================
    # 2. GET DOCUMENT CHUNKS
    # =====================================================

    cursor.execute("""
        SELECT
            id,
            page_number,
            chunk_index,
            text
        FROM chunks
        WHERE document_id = ?
        ORDER BY page_number, chunk_index
    """, (document_id,))

    chunks = cursor.fetchall()

    if not chunks:

        connection.close()

        return jsonify({
            "error": "DOCUMENT_NOT_FOUND",
            "message": "No content found for this document."
        }), 404

    document_chunks = []

    for chunk in chunks:

        document_chunks.append({
            "page": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "text": chunk["text"]
        })

    # =====================================================
    # 3. GENERATE SUMMARY USING OPENROUTER
    # =====================================================

    print("SUMMARY CACHE MISS:", document_id)
    print("GENERATING SUMMARY WITH OPENROUTER...")

    result = generate_summary(document_chunks)

    # =====================================================
    # 4. SAVE SUMMARY TO DATABASE
    # =====================================================

    now = datetime.utcnow().isoformat()

    ccursor.execute("""
    INSERT INTO document_summaries (
        document_id,
        summary,
        key_points,
        entities,
        citations,
        created_at,
        updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)

    ON CONFLICT(document_id)
    DO UPDATE SET
        summary = excluded.summary,
        key_points = excluded.key_points,
        entities = excluded.entities,
        citations = excluded.citations,
        updated_at = excluded.updated_at
""", (
    document_id,
    result.get("summary", ""),
    json.dumps(
        result.get("key_points", [])
    ),
    json.dumps(
        result.get("entities", [])
    ),
    json.dumps(
        result.get("citations", [])
    ),
    now,
    now
))

    connection.commit()
    connection.close()

    print("SUMMARY SAVED TO DATABASE:", document_id)

    # =====================================================
    # 5. RETURN GENERATED SUMMARY
    # =====================================================

    return jsonify({
        "document_id": document_id,
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
        "entities": result.get("entities", []),
        "citations": result.get("citations", []),
        "cached": False
    }), 200

@summary_bp.route("/<document_id>/summary/regenerate", methods=["POST"])
def regenerate_summary(document_id):

    connection = get_db_connection()
    cursor = connection.cursor()

    # Get document chunks
    cursor.execute("""
        SELECT
            id,
            page_number,
            chunk_index,
            text
        FROM chunks
        WHERE document_id = ?
        ORDER BY page_number, chunk_index
    """, (document_id,))

    chunks = cursor.fetchall()

    if not chunks:
        connection.close()

        return jsonify({
            "error": "DOCUMENT_NOT_FOUND",
            "message": "No content found for this document."
        }), 404

    document_chunks = []

    for chunk in chunks:
        document_chunks.append({
            "page": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "text": chunk["text"]
        })

    print("REGENERATING SUMMARY:", document_id)

    # Bypass cache and call OpenRouter
    result = generate_summary(document_chunks)

    now = datetime.utcnow().isoformat()

    # Replace existing cached summary
    cursor.execute("""
        INSERT INTO document_summaries (
            document_id,
            summary,
            key_points,
            entities,
            citations,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)

        ON CONFLICT(document_id)
        DO UPDATE SET
            summary = excluded.summary,
            key_points = excluded.key_points,
            entities = excluded.entities,
            citations = excluded.citations,
            updated_at = excluded.updated_at
    """, (
        document_id,
        result.get("summary", ""),
        json.dumps(result.get("key_points", [])),
        json.dumps(result.get("entities", [])),
        json.dumps(result.get("citations", [])),
        now,
        now
    ))

    connection.commit()
    connection.close()

    print("SUMMARY REGENERATED AND SAVED:", document_id)

    return jsonify({
        "document_id": document_id,
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
        "entities": result.get("entities", []),
        "citations": result.get("citations", []),
        "cached": False
    }), 200