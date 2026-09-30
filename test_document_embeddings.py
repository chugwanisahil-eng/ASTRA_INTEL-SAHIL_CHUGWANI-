from database.db import get_db_connection
from services.embedding_store import generate_document_embeddings


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

    print("No documents found in database.")

else:

    print("Document:", document["filename"])
    print("Document ID:", document["id"])

    count = generate_document_embeddings(
        document["id"]
    )

    print("Embeddings stored:", count)