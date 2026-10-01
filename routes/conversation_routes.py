import json
import uuid

from flask import Blueprint, request, jsonify

from database.db import get_db_connection
from services.retrieval_service import retrieve_relevant_chunks
from services.llm_service import (
    generate_answer,
    generate_comparison
)


conversation_bp = Blueprint(
    "conversations",
    __name__,
    url_prefix="/api/conversations"
)


# =========================================================
# LIST CONVERSATIONS
# =========================================================

@conversation_bp.route("", methods=["GET"])
def list_conversations():

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            title,
            document_ids,
            created_at,
            updated_at
        FROM conversations
        ORDER BY updated_at DESC
    """)

    rows = cursor.fetchall()
    connection.close()

    conversations = []

    for row in rows:

        document_ids = []

        if row["document_ids"]:
            try:
                document_ids = json.loads(
                    row["document_ids"]
                )
            except Exception:
                document_ids = []

        conversations.append({
            "id": row["id"],
            "title": row["title"],
            "document_ids": document_ids,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        })

    return jsonify(conversations), 200


# =========================================================
# CREATE CONVERSATION
# =========================================================

@conversation_bp.route("", methods=["POST"])
def create_conversation():

    data = request.get_json(silent=True) or {}

    document_ids = data.get("document_ids", [])

    if not isinstance(document_ids, list):
        document_ids = []

    conversation_id = str(uuid.uuid4())

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO conversations (
            id,
            title,
            document_ids
        )
        VALUES (?, ?, ?)
    """, (
        conversation_id,
        "New chat",
        json.dumps(document_ids)
    ))

    connection.commit()
    connection.close()

    return jsonify({
        "id": conversation_id,
        "title": "New chat",
        "document_ids": document_ids,
        "messages": []
    }), 201


# =========================================================
# GET ONE CONVERSATION
# =========================================================

@conversation_bp.route("/<conversation_id>", methods=["GET"])
def get_conversation(conversation_id):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            title,
            document_ids,
            created_at,
            updated_at
        FROM conversations
        WHERE id = ?
    """, (conversation_id,))

    conversation = cursor.fetchone()

    if not conversation:
        connection.close()

        return jsonify({
            "error": "NOT_FOUND",
            "message": "Conversation not found."
        }), 404

    cursor.execute("""
        SELECT
            id,
            role,
            content,
            citations,
            created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
    """, (conversation_id,))

    message_rows = cursor.fetchall()

    connection.close()

    document_ids = []

    if conversation["document_ids"]:
        try:
            document_ids = json.loads(
                conversation["document_ids"]
            )
        except Exception:
            document_ids = []

    messages = []

    for row in message_rows:

        citations = []

        if row["citations"]:
            try:
                citations = json.loads(
                    row["citations"]
                )
            except Exception:
                citations = []

        # -------------------------------------------------
        # Detect comparison messages
        # -------------------------------------------------

        compare = None

        if row["role"] == "assistant":

            try:
                parsed_content = json.loads(
                    row["content"]
                )

                if (
                    isinstance(parsed_content, dict)
                    and parsed_content.get("type") == "comparison"
                ):

                    compare = {
                        "similarities": parsed_content.get(
                            "similarities",
                            []
                        ),
                        "differences": parsed_content.get(
                            "differences",
                            []
                        ),
                        "new_information": parsed_content.get(
                            "new_information",
                            []
                        ),
                        "removed_information": parsed_content.get(
                            "removed_information",
                            []
                        )
                    }

            except Exception:
                compare = None

        message = {
            "id": row["id"],
            "role": row["role"],
            "content": row["content"],
            "citations": citations,
            "created_at": row["created_at"]
        }

        if compare:
            message["compare"] = compare
            message["sources"] = citations

        messages.append(message)

    return jsonify({
        "id": conversation["id"],
        "title": conversation["title"],
        "document_ids": document_ids,
        "created_at": conversation["created_at"],
        "updated_at": conversation["updated_at"],
        "messages": messages
    }), 200


# =========================================================
# SEND MESSAGE
# =========================================================

@conversation_bp.route(
    "/<conversation_id>/messages",
    methods=["POST"]
)
def send_message(conversation_id):

    data = request.get_json(silent=True) or {}

    question = data.get(
        "question",
        ""
    ).strip()

    if not question:
        return jsonify({
            "error": "EMPTY_QUESTION",
            "message": "Please provide a question."
        }), 400

    document_ids = data.get(
        "document_ids",
        []
    )

    if not isinstance(document_ids, list):
        document_ids = []

    if not document_ids:
        return jsonify({
            "error": "NO_DOCUMENT",
            "message": "Select a document before asking a question."
        }), 400

    # -----------------------------------------------------
    # Get mode
    # -----------------------------------------------------

    mode = data.get(
        "mode",
        "single"
    )

    # -----------------------------------------------------
    # Open database connection
    # -----------------------------------------------------

    connection = get_db_connection()
    cursor = connection.cursor()

    # -----------------------------------------------------
    # Make sure conversation exists
    # -----------------------------------------------------

    cursor.execute("""
        SELECT
            id,
            title
        FROM conversations
        WHERE id = ?
    """, (conversation_id,))

    conversation = cursor.fetchone()

    if not conversation:
        connection.close()

        return jsonify({
            "error": "NOT_FOUND",
            "message": "Conversation not found."
        }), 404

    # -----------------------------------------------------
    # Store user's question
    # -----------------------------------------------------

    cursor.execute("""
        INSERT INTO messages (
            conversation_id,
            role,
            content
        )
        VALUES (?, ?, ?)
    """, (
        conversation_id,
        "user",
        question
    ))

    # =====================================================
    # COMPARE MODE
    # =====================================================

    if mode == "compare":

        # -------------------------------------------------
        # Require at least two documents
        # -------------------------------------------------

        if len(document_ids) < 2:

            connection.close()

            return jsonify({
                "error": "COMPARE_REQUIRES_TWO_DOCUMENTS",
                "message": "Select at least two documents to compare."
            }), 400

        # -------------------------------------------------
        # Only compare first two selected documents
        # -------------------------------------------------

        document_a_id = document_ids[0]
        document_b_id = document_ids[1]

        # -------------------------------------------------
        # Get Document A
        # -------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                filename
            FROM documents
            WHERE id = ?
        """, (document_a_id,))

        document_a = cursor.fetchone()

        # -------------------------------------------------
        # Get Document B
        # -------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                filename
            FROM documents
            WHERE id = ?
        """, (document_b_id,))

        document_b = cursor.fetchone()

        if not document_a or not document_b:

            connection.close()

            return jsonify({
                "error": "DOCUMENT_NOT_FOUND",
                "message": "One or more selected documents were not found."
            }), 404

        # -------------------------------------------------
        # Get chunks from Document A
        # -------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                page_number AS page,
                chunk_index,
                text
            FROM chunks
            WHERE document_id = ?
            ORDER BY page_number, chunk_index
        """, (document_a_id,))

        document_a_chunks = [
            dict(row)
            for row in cursor.fetchall()
        ]

        # -------------------------------------------------
        # Get chunks from Document B
        # -------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                page_number AS page,
                chunk_index,
                text
            FROM chunks
            WHERE document_id = ?
            ORDER BY page_number, chunk_index
        """, (document_b_id,))

        document_b_chunks = [
            dict(row)
            for row in cursor.fetchall()
        ]

        # -------------------------------------------------
        # Generate comparison
        # -------------------------------------------------

        comparison = generate_comparison(
            document_a_chunks,
            document_b_chunks,
            document_a["filename"],
            document_b["filename"]
        )

        # -------------------------------------------------
        # Get citations
        # -------------------------------------------------

        citations = comparison.get(
            "citations",
            []
        )

        # -------------------------------------------------
        # Add actual document IDs
        # -------------------------------------------------

        for citation in citations:

            if citation.get(
                "document_side"
            ) == "A":

                citation["document_id"] = (
                    document_a_id
                )

            elif citation.get(
                "document_side"
            ) == "B":

                citation["document_id"] = (
                    document_b_id
                )

        # -------------------------------------------------
        # Prepare comparison data
        # -------------------------------------------------

        compare_data = {
            "type": "comparison",

            "similarities": comparison.get(
                "similarities",
                []
            ),

            "differences": comparison.get(
                "differences",
                []
            ),

            "new_information": comparison.get(
                "new_information",
                []
            ),

            "removed_information": comparison.get(
                "removed_information",
                []
            )
        }

        # -------------------------------------------------
        # Store comparison inside message
        # -------------------------------------------------

        cursor.execute("""
            INSERT INTO messages (
                conversation_id,
                role,
                content,
                citations
            )
            VALUES (?, ?, ?, ?)
        """, (
            conversation_id,
            "assistant",
            json.dumps(compare_data),
            json.dumps(citations)
        ))

        # -------------------------------------------------
        # Update conversation title
        # -------------------------------------------------

        current_title = conversation["title"]

        if current_title == "New chat":

            title = (
                "Compare: "
                + document_a["filename"]
            )

            if len(title) > 60:
                title = title[:60] + "..."

            cursor.execute("""
                UPDATE conversations
                SET
                    title = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                title,
                conversation_id
            ))

        else:

            cursor.execute("""
                UPDATE conversations
                SET
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                conversation_id,
            ))

        # -------------------------------------------------
        # Save comparison
        # -------------------------------------------------

        connection.commit()
        connection.close()

        return jsonify({
            "conversation_id": conversation_id,
            "question": question,
            "answer": "",

            "compare": {
                "similarities": comparison.get(
                    "similarities",
                    []
                ),

                "differences": comparison.get(
                    "differences",
                    []
                ),

                "new_information": comparison.get(
                    "new_information",
                    []
                ),

                "removed_information": comparison.get(
                    "removed_information",
                    []
                )
            },

            "citations": citations,
            "sources": citations

        }), 200

    # =====================================================
    # NORMAL CHAT / SINGLE MODE
    # =====================================================

    # -----------------------------------------------------
    # Retrieve relevant chunks
    # -----------------------------------------------------

    all_chunks = []

    for document_id in document_ids:

        chunks = retrieve_relevant_chunks(
            document_id=document_id,
            question=question,
            top_k=5,
            min_score=0.35
        )

        for chunk in chunks:

            chunk["document_id"] = document_id

            all_chunks.append(chunk)

    # -----------------------------------------------------
    # Sort all retrieved chunks by similarity
    # -----------------------------------------------------

    all_chunks.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    # -----------------------------------------------------
    # Keep strongest results
    # -----------------------------------------------------

    all_chunks = all_chunks[:5]

    # -----------------------------------------------------
    # Generate grounded answer
    # -----------------------------------------------------

    result = generate_answer(
        question,
        all_chunks
    )

    answer = result["answer"]

    citations = result.get(
        "citations",
        []
    )

    # -----------------------------------------------------
    # Store assistant response
    # -----------------------------------------------------

    cursor.execute("""
        INSERT INTO messages (
            conversation_id,
            role,
            content,
            citations
        )
        VALUES (?, ?, ?, ?)
    """, (
        conversation_id,
        "assistant",
        answer,
        json.dumps(citations)
    ))

    # -----------------------------------------------------
    # Update conversation title
    # -----------------------------------------------------

    current_title = conversation["title"]

    if current_title == "New chat":

        title = question[:60]

        if len(question) > 60:
            title += "..."

        cursor.execute("""
            UPDATE conversations
            SET
                title = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            title,
            conversation_id
        ))

    else:

        cursor.execute("""
            UPDATE conversations
            SET
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            conversation_id,
        ))

    # -----------------------------------------------------
    # Save everything
    # -----------------------------------------------------

    connection.commit()
    connection.close()

    # -----------------------------------------------------
    # Return normal answer
    # -----------------------------------------------------

    return jsonify({
        "conversation_id": conversation_id,
        "question": question,
        "answer": answer,
        "citations": citations
    }), 200


# =========================================================
# RENAME CONVERSATION
# =========================================================

@conversation_bp.route(
    "/<conversation_id>",
    methods=["PUT"]
)
def rename_conversation(conversation_id):

    data = request.get_json(
        silent=True
    ) or {}

    title = data.get(
        "title",
        ""
    ).strip()

    if not title:

        return jsonify({
            "error": "EMPTY_TITLE",
            "message": "Conversation title cannot be empty."
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE conversations
        SET
            title = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (
        title,
        conversation_id
    ))

    if cursor.rowcount == 0:

        connection.close()

        return jsonify({
            "error": "NOT_FOUND",
            "message": "Conversation not found."
        }), 404

    connection.commit()
    connection.close()

    return jsonify({
        "id": conversation_id,
        "title": title
    }), 200


# =========================================================
# DELETE CONVERSATION
# =========================================================

@conversation_bp.route(
    "/<conversation_id>",
    methods=["DELETE"]
)
def delete_conversation(conversation_id):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id
        FROM conversations
        WHERE id = ?
    """, (conversation_id,))

    conversation = cursor.fetchone()

    if not conversation:

        connection.close()

        return jsonify({
            "error": "NOT_FOUND",
            "message": "Conversation not found."
        }), 404

    # -----------------------------------------------------
    # Delete messages first
    # -----------------------------------------------------

    cursor.execute("""
        DELETE FROM messages
        WHERE conversation_id = ?
    """, (conversation_id,))

    # -----------------------------------------------------
    # Delete conversation
    # -----------------------------------------------------

    cursor.execute("""
        DELETE FROM conversations
        WHERE id = ?
    """, (conversation_id,))

    connection.commit()
    connection.close()

    return "", 204