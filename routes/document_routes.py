import os
import uuid

from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename

from database.db import get_db_connection
from services.pdf_service import extract_pdf_pages
from services.chunk_service import chunk_text
from services.embedding_store import generate_document_embeddings


document_bp = Blueprint(
    "documents",
    __name__,
    url_prefix="/api/documents"
)


# =========================================================
# GET ALL DOCUMENTS
# =========================================================

@document_bp.route("", methods=["GET"])
def list_documents():

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            filename,
            file_path,
            page_count,
            created_at
        FROM documents
        ORDER BY created_at DESC
    """)

    rows = cursor.fetchall()
    connection.close()

    documents = []

    for row in rows:
        documents.append({
            "id": row["id"],
            "filename": row["filename"],
            "page_count": row["page_count"],
            "status": "ready",
            "created_at": row["created_at"]
        })

    return jsonify(documents), 200


# =========================================================
# GET DOCUMENT FILE
# =========================================================

@document_bp.route("/<document_id>/file", methods=["GET"])
def get_document_file(document_id):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT file_path, filename
        FROM documents
        WHERE id = ?
    """, (document_id,))

    document = cursor.fetchone()
    connection.close()

    if not document:
        return jsonify({
            "error": "DOCUMENT_NOT_FOUND",
            "message": "Document not found."
        }), 404

    file_path = document["file_path"]

    if not os.path.exists(file_path):
        return jsonify({
            "error": "FILE_NOT_FOUND",
            "message": "The document file is missing from the server."
        }), 404

    return send_file(
        file_path,
        mimetype="application/pdf",
        as_attachment=False,
        download_name=document["filename"]
    )

# =========================================================
# DELETE DOCUMENT
# =========================================================

@document_bp.route("/<document_id>", methods=["DELETE"])
def delete_document(document_id):

    connection = get_db_connection()
    cursor = connection.cursor()

    # Find document
    cursor.execute("""
        SELECT file_path
        FROM documents
        WHERE id = ?
    """, (document_id,))

    document = cursor.fetchone()

    if not document:
        connection.close()

        return jsonify({
            "error": "DOCUMENT_NOT_FOUND",
            "message": "Document not found."
        }), 404

    file_path = document["file_path"]

    try:
        # -------------------------------------------------
        # Delete embeddings belonging to this document
        # -------------------------------------------------

        cursor.execute("""
            DELETE FROM embeddings
            WHERE chunk_id IN (
                SELECT id
                FROM chunks
                WHERE document_id = ?
            )
        """, (document_id,))

        # -------------------------------------------------
        # Delete chunks
        # -------------------------------------------------

        cursor.execute("""
            DELETE FROM chunks
            WHERE document_id = ?
        """, (document_id,))

        # -------------------------------------------------
        # Delete document record
        # -------------------------------------------------

        cursor.execute("""
            DELETE FROM documents
            WHERE id = ?
        """, (document_id,))

        connection.commit()
        connection.close()

        # -------------------------------------------------
        # Delete actual PDF file
        # -------------------------------------------------

        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        print("DOCUMENT DELETED:", document_id)

        return jsonify({
            "message": "Document deleted successfully.",
            "document_id": document_id
        }), 200

    except Exception as e:

        connection.rollback()
        connection.close()

        print("DELETE DOCUMENT ERROR:", e)

        return jsonify({
            "error": "DELETE_ERROR",
            "message": "Failed to delete document."
        }), 500

# =========================================================
# UPLOAD DOCUMENT
# =========================================================

@document_bp.route("/upload", methods=["POST"])
def upload_document():

    if "file" not in request.files:
        return jsonify({
            "error": "NO_FILE",
            "message": "No document was uploaded."
        }), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({
            "error": "NO_FILE",
            "message": "No document was selected."
        }), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({
            "error": "INVALID_FILE",
            "message": "Only PDF documents are currently supported."
        }), 400

    # Generate unique document ID
    document_id = str(uuid.uuid4())

    filename = secure_filename(file.filename)

    saved_filename = f"{document_id}_{filename}"

    upload_folder = current_app.config["UPLOAD_FOLDER"]

    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(
        upload_folder,
        saved_filename
    )

    # Save PDF
    file.save(file_path)

    # =====================================================
    # EXTRACT PDF
    # =====================================================

    try:

        pages = extract_pdf_pages(file_path)

        print("PDF PAGES EXTRACTED:", len(pages))

    except Exception as e:

        print("PDF extraction error:", e)

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "error": "CORRUPT_PDF",
            "message": "The uploaded PDF could not be processed."
        }), 400

    # Check readable text
    total_text = "".join(
        page["text"] for page in pages
    ).strip()

    if not total_text:

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "error": "EMPTY_DOCUMENT",
            "message": "No readable text was found in this PDF."
        }), 400

    # =====================================================
    # SAVE DOCUMENT + CHUNKS
    # =====================================================

    try:

        connection = get_db_connection()
        cursor = connection.cursor()

        # Insert document
        cursor.execute("""
            INSERT INTO documents (
                id,
                filename,
                file_path,
                page_count
            )
            VALUES (?, ?, ?, ?)
        """, (
            document_id,
            filename,
            file_path,
            len(pages)
        ))

        chunk_index = 0

        for page in pages:

            page_chunks = chunk_text(page["text"])

            for chunk in page_chunks:

                cursor.execute("""
                    INSERT INTO chunks (
                        document_id,
                        page_number,
                        chunk_index,
                        text
                    )
                    VALUES (?, ?, ?, ?)
                """, (
                    document_id,
                    page["page"],
                    chunk_index,
                    chunk
                ))

                chunk_index += 1

        # Commit AFTER all chunks are inserted
        connection.commit()

        print("CHUNKS STORED:", chunk_index)

        connection.close()

    except Exception as e:

        print("Database error:", e)

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "error": "DATABASE_ERROR",
            "message": "Failed to save document information."
        }), 500

    # =====================================================
    # GENERATE EMBEDDINGS
    # =====================================================

    try:

        print(
            "STARTING EMBEDDING GENERATION:",
            document_id
        )

        embedding_count = generate_document_embeddings(
            document_id
        )

        print(
            "EMBEDDINGS STORED:",
            embedding_count
        )

        if embedding_count == 0:

            return jsonify({
                "error": "EMBEDDING_ERROR",
                "message": "Document was uploaded, but embeddings could not be generated."
            }), 500

    except Exception as e:

        print(
            "Embedding generation error:",
            e
        )

        return jsonify({
            "error": "EMBEDDING_ERROR",
            "message": "Document was uploaded, but embeddings could not be generated."
        }), 500

    # =====================================================
    # SUCCESS
    # =====================================================

    return jsonify({
        "id": document_id,
        "document_id": document_id,
        "message": "Document uploaded successfully.",
        "filename": filename,
        "pages": len(pages),
        "page_count": len(pages),
        "status": "ready"
    }), 200