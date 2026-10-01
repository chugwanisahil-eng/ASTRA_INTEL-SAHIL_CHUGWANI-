
# Astra Intel

## AI-Powered Document Intelligence Platform

Astra Intel is an AI-powered document intelligence platform that helps users understand, search, summarize, and compare PDF documents through an interactive interface.

Instead of manually reading through large documents, users can upload their PDFs and interact with them using natural language. Astra Intel uses Retrieval-Augmented Generation (RAG), semantic search, OCR, document embeddings, and an LLM to provide document-grounded answers with page-level citations.

---

## Features

### PDF Document Processing

- Upload PDF documents
- Extract text from PDFs using PyMuPDF
- OCR support for scanned and image-based PDF pages
- Page-wise document processing
- Intelligent text chunking with overlapping chunks
- Document processing status tracking
- Error handling for invalid or problematic documents

### AI-Powered Question Answering

- Ask natural-language questions about uploaded documents
- Multi-turn conversations
- Context-aware responses
- Answers grounded in the uploaded document
- Uses retrieved document sections as context for the LLM
- Handles cases where relevant information cannot be found

### Intelligent Search

Astra Intel uses a hybrid retrieval approach combining:

- Semantic similarity
- Keyword matching
- Exact phrase matching

This helps retrieve the most relevant sections of a document for a user's question.

### Document Citations

- Page-level citations
- Source excerpts
- Clickable citations
- Direct navigation to the referenced PDF page
- Allows users to verify AI-generated answers against the original document

### Document Summarization

Astra Intel can generate summaries of uploaded documents.

The summary system can provide:

- Concise document summary
- Key points
- Relevant entities
- Supporting citations

### Document Comparison

Users can select two documents and compare their contents.

The comparison provides:

- Similarities
- Differences
- New Information
- Removed Information

This allows users to quickly understand how two documents relate to each other without manually reading both documents in their entirety.

### Multi-Document Workspace

- Upload multiple documents
- Select multiple documents
- Switch between documents
- Compare selected documents
- Maintain document-specific context

### Conversation Management

- Create conversations
- Persistent chat history
- Multi-turn conversations
- Rename conversations
- Delete conversations
- Reopen previous conversations

### User Interface

- Modern React-based interface
- PDF document viewer
- Interactive chat interface
- Document selection
- Search interface
- Dark/light theme support
- Responsive layout
- Processing states
- Error states
- Interactive citation navigation

---

# Architecture

```text
                         ┌─────────────────────┐
                         │      React UI       │
                         │        Vite         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Flask API      │
                         └──────────┬──────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      PDF Processing         Retrieval Engine       Conversation
             │                      │                      │
             ▼                      ▼                      ▼
       PyMuPDF + OCR       Embeddings + Hybrid        SQLite
                                  Search
             │                      │
             └──────────────┬───────┘
                            ▼
                     OpenRouter LLM
                            │
                            ▼
                   Grounded AI Response
                            │
                            ▼
                      Page Citations
````

---

# RAG Pipeline

Astra Intel follows a Retrieval-Augmented Generation architecture.

```text
                    PDF Upload
                        │
                        ▼
               Text Extraction / OCR
                        │
                        ▼
                    Chunking
                        │
                        ▼
              Sentence Embeddings
                        │
                        ▼
                 SQLite Storage
                        │
                        ▼
                  User Question
                        │
                        ▼
               Hybrid Retrieval
                        │
                        ▼
                Relevant Chunks
                        │
                        ▼
                 OpenRouter LLM
                        │
                        ▼
               Grounded Response
                        │
                        ▼
                Page Citations
```

---

# How It Works

## 1. Document Upload

The user uploads a PDF through the frontend.

The document is sent to the Flask backend for processing.

## 2. Text Extraction

PyMuPDF extracts text from the PDF page by page.

For pages where sufficient text cannot be extracted, Tesseract OCR is used to extract text from the page image.

## 3. Chunking

The extracted text is divided into smaller overlapping chunks.

Chunking allows the retrieval system to work with relevant sections instead of passing the entire document to the language model.

## 4. Embeddings

Each document chunk is converted into a vector representation using the Sentence Transformers model:

```text
all-MiniLM-L6-v2
```

These embeddings are stored in the SQLite database.

## 5. User Question

When the user asks a question, the question is also converted into an embedding.

## 6. Hybrid Retrieval

Astra Intel retrieves relevant document chunks using multiple signals:

```text
Semantic Similarity
        +
Keyword Matching
        +
Exact Phrase Matching
        ↓
Hybrid Retrieval Score
```

The highest-scoring chunks are selected as context.

## 7. LLM Generation

The retrieved document sections are passed to the LLM through OpenRouter.

The LLM is instructed to answer using the provided document context.

## 8. Citations

The retrieved chunks contain page information.

The response can therefore be linked back to the relevant PDF page so users can verify the answer.

---

# Document Comparison

Astra Intel supports comparison between two selected documents.

The comparison pipeline works as follows:

```text
Document A ──► Extracted Chunks ──┐
                                  │
                                  ▼
                            Comparison LLM
                                  │
Document B ──► Extracted Chunks ──┘
                                  │
                                  ▼
                     ┌──────────────────────┐
                     │     Comparison       │
                     ├──────────────────────┤
                     │ Similarities         │
                     │ Differences          │
                     │ New Information      │
                     │ Removed Information  │
                     └──────────────────────┘
```

The result is displayed directly inside the conversation interface.

---

# Technology Stack

## Frontend

* React
* Vite
* JavaScript
* CSS

## Backend

* Python
* Flask
* Flask-CORS

## Artificial Intelligence / Machine Learning

* OpenRouter
* Sentence Transformers
* `all-MiniLM-L6-v2`
* Vector embeddings
* Retrieval-Augmented Generation
* Hybrid retrieval

## Document Processing

* PyMuPDF
* Tesseract OCR
* PDF text extraction
* Text chunking

## Database

* SQLite

---

# Project Structure

```text
Astra-Intel/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── api/
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── database/
│   ├── uploads/
│   ├── app.py
│   ├── requirements.txt
│   └── ...
│
├── README.md
└── ...
```

---

# Installation

## Prerequisites

Make sure the following are installed:

* Python 3.x
* Node.js
* npm
* Tesseract OCR
* Git

---

# Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file inside the backend directory.

```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

Replace:

```text
your_openrouter_api_key
```

with your actual OpenRouter API key.

### Important

Never commit your `.env` file or API keys to GitHub.

Add the following to `.gitignore`:

```gitignore
.env
venv/
__pycache__/
*.pyc
uploads/
*.db
```

---

# Running the Backend

From the backend directory:

```bash
python app.py
```

The Flask backend runs on:

```text
http://localhost:5000
```

---

# Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally run on:

```text
http://localhost:5173
```

Open the URL in your browser.

---

# API Endpoints

## Documents

### Upload Document

```text
POST /api/documents/upload
```

Uploads and processes a PDF document.

### List Documents

```text
GET /api/documents
```

Returns the available documents.

### Get Document File

```text
GET /api/documents/<id>/file
```

Returns the original PDF file.

### Delete Document

```text
DELETE /api/documents/<id>
```

Deletes a document.

---

# Conversations

### List Conversations

```text
GET /api/conversations
```

### Create Conversation

```text
POST /api/conversations
```

### Get Conversation

```text
GET /api/conversations/<id>
```

### Send Message

```text
POST /api/conversations/<id>/messages
```

Supports both normal document Q&A and document comparison.

### Rename Conversation

```text
PATCH /api/conversations/<id>
```

### Delete Conversation

```text
DELETE /api/conversations/<id>
```

---

# Search and Summary

### Semantic Search

```text
GET /api/documents/<id>/search
```

Searches the document for relevant content.

### Document Summary

```text
GET /api/documents/<id>/summary
```

Generates or retrieves a document summary.

---

# Database

Astra Intel uses SQLite for persistent storage.

The database stores information related to:

* Documents
* Document chunks
* Embeddings
* Conversations
* Messages
* Document summaries

The database allows conversations and processed document information to persist across application sessions.

---

# Grounded AI

Astra Intel is designed around document-grounded responses.

Instead of directly sending a user's question to the language model, the system first retrieves relevant sections from the uploaded document.

```text
User Question
      │
      ▼
Retrieve Relevant Evidence
      │
      ▼
Provide Evidence to LLM
      │
      ▼
Generate Answer
```

This approach helps keep responses connected to the source document and provides users with citations for verification.

---

# Error Handling

Astra Intel handles common situations such as:

* No document uploaded
* Invalid PDF
* Empty document
* Failed document processing
* OCR processing issues
* Missing API key
* Network/API failures
* No relevant information found
* Invalid comparison requests

---

# Example Workflow

```text
1. Open Astra Intel
        │
        ▼
2. Upload a PDF
        │
        ▼
3. Wait for document processing
        │
        ▼
4. Select the document
        │
        ▼
5. Ask a question
        │
        ▼
6. Astra Intel retrieves relevant content
        │
        ▼
7. AI generates a grounded answer
        │
        ▼
8. Click the citation
        │
        ▼
9. PDF opens at the referenced page
```

---

# Example Comparison Workflow

```text
1. Upload Document A
        │
        ▼
2. Upload Document B
        │
        ▼
3. Select both documents
        │
        ▼
4. Enable Compare mode
        │
        ▼
5. Send comparison request
        │
        ▼
6. Astra Intel analyzes both documents
        │
        ▼
7. Results are generated
        │
        ├── Similarities
        ├── Differences
        ├── New Information
        └── Removed Information
```

---

# Security

* API keys are stored in environment variables.
* API keys should never be committed to source control.
* Uploaded documents should be handled securely.
* Production deployments should use appropriate authentication, authorization, HTTPS, and secure file-storage practices.

---

# Limitations

* AI response quality depends on the quality and structure of the uploaded documents.
* OCR accuracy depends on the quality of scanned pages.
* Very large documents may require additional retrieval and context optimization.
* LLM availability depends on OpenRouter and the configured model.
* AI-generated answers should be verified against the cited source pages when accuracy is important.

---

# Future Improvements

Possible future improvements include:

* Advanced retrieval reranking
* More precise citation highlighting
* Streaming AI responses
* Advanced multi-document question answering
* Improved OCR
* Local/open-source LLM support
* Exportable summaries and reports
* Advanced document analytics
* Improved large-document processing

---

# Project Objective

The objective of Astra Intel is to make complex documents easier to understand and interact with.

Traditional document reading requires users to manually search through pages of content. Astra Intel combines document processing, semantic search, retrieval-augmented generation, summarization, and document comparison into a single platform.

The system allows users to:

```text
Upload
   ↓
Understand
   ↓
Search
   ↓
Ask Questions
   ↓
Compare
   ↓
Verify with Citations
```

This provides an interactive way to work with large PDF documents while keeping the generated responses connected to the original source material.

---

# Conclusion

Astra Intel combines modern AI and document-processing technologies to create an interactive document intelligence platform.

The system integrates:

* PDF processing
* OCR
* Semantic embeddings
* Hybrid retrieval
* Retrieval-Augmented Generation
* AI-powered question answering
* Document summarization
* Document comparison
* Persistent conversations
* Page-level citations

Together, these components provide a complete workflow for interacting with and understanding PDF documents through AI.

---

## Built With

**React • Vite • Flask • Python • SQLite • PyMuPDF • Tesseract OCR • Sentence Transformers • OpenRouter**

---

## Project Name

# Astra Intel

**AI-Powered Document Intelligence Platform**

