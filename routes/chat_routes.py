from flask import Blueprint, request, jsonify

from services.retrieval_service import retrieve_relevant_chunks
from services.llm_service import generate_answer


chat_bp = Blueprint(
    "chat",
    __name__,
    url_prefix="/api/documents"
)


@chat_bp.route("/<document_id>/chat", methods=["POST"])
def chat(document_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "INVALID_REQUEST",
            "message": "Request body is required."
        }), 400

    question = data.get("question", "").strip()

    if not question:
        return jsonify({
            "error": "EMPTY_QUESTION",
            "message": "Please provide a question."
        }), 400

    # Retrieve relevant chunks
    chunks = retrieve_relevant_chunks(
        document_id=document_id,
        question=question,
        top_k=5,
        min_score=0.10
    )
    print("RETRIEVED CHUNKS:", len(chunks))
    print("CHUNK PAGES:", [chunk["page"] for chunk in chunks])
    # Generate grounded answer
    result = generate_answer(
        question,
        chunks
    )

    return jsonify({
        "document_id": document_id,
        "question": question,
        "answer": result["answer"],
        "citations": result["citations"]
    }), 200