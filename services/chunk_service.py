def chunk_text(text, chunk_size=800, overlap=150):
    """
    Split text into overlapping chunks.

    chunk_size:
        Approximate number of characters per chunk.

    overlap:
        Number of characters shared between consecutive chunks.
    """

    text = text.strip()

    if not text:
        return []

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks