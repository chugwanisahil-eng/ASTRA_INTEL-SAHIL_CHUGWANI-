from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from services.llm_service import generate_comparison


compare_bp = Blueprint(
    "compare",
    __name__,
    url_prefix="/api"
)


@compare_bp.route("/compare", methods=["POST"])
def compare_documents():

    data = request.get_json() or {}

    document_a_id = data.get("document_a_id")
    document_b_id = data.get("document_b_id")

    if not document_a_id or not document_b_id:
        return jsonify({
            "error": "TWO_DOCUMENTS_REQUIRED",
            "message": "Please select two documents to compare."
        }), 400

    if document_a_id == document_b_id:
        return jsonify({
            "error": "SAME_DOCUMENT",
            "message": "Please select two different documents."
        }), 400


    connection = get_db_connection()
    cursor = connection.cursor()


    # --------------------------------------------------
    # Get document information
    # --------------------------------------------------

    cursor.execute(
        """
        SELECT id, filename
        FROM documents
        WHERE id = ?
        """,
        (document_a_id,)
    )

    document_a = cursor.fetchone()


    cursor.execute(
        """
        SELECT id, filename
        FROM documents
        WHERE id = ?
        """,
        (document_b_id,)
    )

    document_b = cursor.fetchone()


    if not document_a or not document_b:
        connection.close()

        return jsonify({
            "error": "DOCUMENT_NOT_FOUND",
            "message": "One or both documents could not be found."
        }), 404


    # --------------------------------------------------
    # Get chunks for document A
    # --------------------------------------------------

    cursor.execute(
        """
        SELECT
            page_number,
            chunk_index,
            text
        FROM chunks
        WHERE document_id = ?
        ORDER BY page_number, chunk_index
        """,
        (document_a_id,)
    )

    chunks_a = cursor.fetchall()


    # --------------------------------------------------
    # Get chunks for document B
    # --------------------------------------------------

    cursor.execute(
        """
        SELECT
            page_number,
            chunk_index,
            text
        FROM chunks
        WHERE document_id = ?
        ORDER BY page_number, chunk_index
        """,
        (document_b_id,)
    )

    chunks_b = cursor.fetchall()

    connection.close()


    if not chunks_a or not chunks_b:
        return jsonify({
            "error": "DOCUMENT_CONTENT_MISSING",
            "message": "One or both documents do not contain processed content."
        }), 400


    # --------------------------------------------------
    # Convert database rows to dictionaries
    # --------------------------------------------------

    document_a_chunks = [
        {
            "page": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "text": chunk["text"]
        }
        for chunk in chunks_a
    ]


    document_b_chunks = [
        {
            "page": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "text": chunk["text"]
        }
        for chunk in chunks_b
    ]


    print(
        "COMPARING:",
        document_a["filename"],
        "VS",
        document_b["filename"]
    )

    print(
        "DOCUMENT A CHUNKS:",
        len(document_a_chunks)
    )

    print(
        "DOCUMENT B CHUNKS:",
        len(document_b_chunks)
    )


    # --------------------------------------------------
    # Generate comparison
    # --------------------------------------------------

    result = generate_comparison(
        document_a_chunks,
        document_b_chunks,
        document_a["filename"],
        document_b["filename"]
    )


    return jsonify({
        "document_a": {
            "id": document_a["id"],
            "filename": document_a["filename"]
        },
        "document_b": {
            "id": document_b["id"],
            "filename": document_b["filename"]
        },
        "similarities": result["similarities"],
        "differences": result["differences"],
        "new_information": result["new_information"],
        "removed_information": result["removed_information"],
        "citations": result["citations"]
    }), 200