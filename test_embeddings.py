from services.embedding_service import create_embeddings


texts = [
    "The project monitors heart rate and oxygen levels.",
    "The system is designed to detect health problems early.",
    "The project uses artificial intelligence and machine learning."
]


embeddings = create_embeddings(texts)

print("Number of chunks:", len(embeddings))
print("Embedding size:", len(embeddings[0]))