from flask import Blueprint, request, jsonify

from database.db import get_db_connection
from services.retrieval_service import retrieve_relevant_chunks


search_bp = Blueprint("search", __name__, url_prefix="/api")


@search_bp.route("/search", methods=["POST"])
def semantic_search():
    data = request.get_json() or {}

    query = (data.get("query") or "").strip()
    document_ids = data.get("document_ids") or []

    if not query:
        return jsonify({
            "error": "Search query is required"
        }), 400

    if not document_ids:
        return jsonify([])

    results = []

    connection = get_db_connection()
    cursor = connection.cursor()

    for document_id in document_ids:
        chunks = retrieve_relevant_chunks(
            document_id=document_id,
            question=query,
            top_k=5,
            min_score=0.05
        )

        cursor.execute(
            """
            SELECT filename
            FROM documents
            WHERE id = ?
            """,
            (document_id,)
        )

        document = cursor.fetchone()

        document_name = (
            document["filename"]
            if document
            else "Unknown document"
        )

        for chunk in chunks:
            results.append({
                "document_id": document_id,
                "document_name": document_name,
                "page": chunk["page"],
                "score": float(chunk["score"]),
                "snippet": chunk["text"]
            })

    connection.close()

    results.sort(
        key=lambda result: result["score"],
        reverse=True
    )

    return jsonify(results[:10])