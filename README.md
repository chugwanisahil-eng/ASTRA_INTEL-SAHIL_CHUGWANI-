# Astra Intel

### AI-Powered Defence Document Intelligence System

Astra Intel is an AI-powered document intelligence system that allows users to upload PDF documents, understand their contents, ask questions, and retrieve document-grounded answers with page-level citations.

Built for **ASTRA Software Team — Challenge 01: ASTRA INTEL**.

---

## Problem

Defence and technology organizations work with large volumes of reports, research papers, and technical documents. Finding relevant information manually can be slow and inefficient.

Astra Intel provides an interactive system that processes uploaded documents and uses AI to help users quickly find and understand relevant information.

---

## Features

- 📄 PDF upload and processing
- 🔤 Text extraction using PyMuPDF
- 🖨️ OCR support for scanned PDFs
- ✂️ Document chunking
- 🧠 Semantic embeddings using `all-MiniLM-L6-v2`
- 🔎 Hybrid retrieval using semantic similarity, keywords, and exact matching
- 💬 Document-grounded AI Q&A
- 📑 Page-level citations
- 📌 Citation-based PDF page navigation
- 📝 AI-generated document summaries
- ⚡ Cached summaries
- 🔍 Semantic search across documents
- 📚 Multiple-document support
- 💾 Persistent conversations
- 🗑️ Document deletion
- ⚠️ Error handling for invalid or failed documents

---

## Tech Stack

### Frontend
- React
- Vite
- React-PDF
- React Markdown
- Lucide React
- CSS

### Backend
- Python
- Flask
- Flask-CORS

### AI / ML
- Sentence Transformers
- `all-MiniLM-L6-v2`
- OpenRouter LLM API
- NumPy

### Document Processing
- PyMuPDF
- Tesseract OCR
- Pillow

### Database
- SQLite

---

## Architecture

```mermaid
flowchart LR

    A[User] --> B[React Frontend]
    B --> C[Flask API]

    C --> D[PDF Processing]
    D --> E[PyMuPDF]
    D --> F[Tesseract OCR]

    E --> G[Chunking]
    F --> G

    G --> H[Sentence Transformer]
    H --> I[(SQLite)]

    I --> J[Hybrid Retrieval]
    J --> K[Relevant Chunks]

    K --> L[OpenRouter LLM]
    L --> M[Grounded Answer + Citations]

    M --> B
