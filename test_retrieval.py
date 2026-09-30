from database.db import get_db_connection
from services.retrieval_service import retrieve_relevant_chunks


# Get latest uploaded document
connection = get_db_connection()
cursor = connection.cursor()

cursor.execute("""
    SELECT id, filename
    FROM documents
    ORDER BY created_at DESC
    LIMIT 1
""")

document = cursor.fetchone()

connection.close()


if document is None:

    print("No document found.")

else:

    print("Document:", document["filename"])
    print("Document ID:", document["id"])

    question = input("\nAsk a question: ")

    results = retrieve_relevant_chunks(
        document["id"],
        question,
        top_k=5
    )

    print("\n--- Relevant Results ---\n")

    for result in results:

        print(
            f"Page: {result['page']} | "
            f"Score: {result['score']:.4f}"
        )

        print(result["text"])

        print("\n" + "-" * 60 + "\n")