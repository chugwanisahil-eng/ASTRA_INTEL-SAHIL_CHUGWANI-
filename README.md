# Astra Intel

## AI-Powered Document Intelligence Platform

Astra Intel is an AI-powered document intelligence platform designed to help users understand, search, summarize, and compare PDF documents through a conversational interface.

The system combines PDF processing, OCR, semantic embeddings, hybrid retrieval, Retrieval-Augmented Generation (RAG), document summarization, document comparison, and page-level citations into a single application.

Instead of manually searching through large PDF documents, users can upload their documents and interact with them using natural language.

---

# Features

## PDF Document Processing

- Upload PDF documents
- Extract text from PDF pages using PyMuPDF
- OCR support for scanned and image-based pages
- Page-wise document processing
- Intelligent text chunking
- Overlapping chunks for better retrieval
- Document processing status
- Error handling for failed document processing

## AI-Powered Question Answering

- Ask natural-language questions about uploaded documents
- Multi-turn conversations
- Context-aware document conversations
- Retrieval-Augmented Generation (RAG)
- Answers based on retrieved document content
- Document-grounded responses
- Handles cases where relevant information cannot be found

## Intelligent Search

Astra Intel uses a hybrid retrieval system combining:

- Semantic similarity
- Keyword matching
- Exact phrase matching

This allows the system to retrieve relevant sections of a document before generating an answer.

## Document Citations

- Page-level citations
- Source excerpts
- Clickable citations
- Navigate directly to the referenced PDF page
- Verify generated answers against the original document

## Document Summarization

Astra Intel can generate summaries of uploaded documents.

The summary system can provide:

- Concise document summary
- Key points
- Relevant entities
- Supporting citations

## Document Comparison

Users can select two documents and compare their contents.

The comparison provides:

- Similarities
- Differences
- New Information
- Removed Information

This allows users to quickly understand how two documents relate to each other.

## Multi-Document Workspace

- Upload multiple PDF documents
- Select documents
- Switch between documents
- Compare selected documents
- Maintain document-specific context

## Conversation Management

- Create new conversations
- Persistent conversation history
- Multi-turn chat
- Rename conversations
- Delete conversations
- Reopen previous conversations

## User Interface

- React-based interface
- Vite development environment
- Integrated PDF viewer
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
                         ┌──────────────────────┐
                         │      React UI        │
                         │        Vite          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Flask API       │
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      PDF Processing         Retrieval Engine       Conversations
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
```

---

# RAG Pipeline

Astra Intel uses a Retrieval-Augmented Generation architecture.

```text
PDF Upload
    │
    ▼
Text Extraction / OCR
    │
    ▼
Text Chunking
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
Grounded Answer
    │
    ▼
Page Citations
```

---

# How Astra Intel Works

## 1. PDF Upload

The user uploads a PDF document through the web interface.

The document is sent to the Flask backend for processing.

## 2. Text Extraction

PyMuPDF extracts text from the document page by page.

For pages where sufficient text cannot be extracted, OCR is used to extract text from the page image.

## 3. Chunking

The extracted text is divided into smaller overlapping chunks.

Chunking allows the retrieval system to work with relevant sections instead of passing an entire document to the language model.

## 4. Embeddings

Each document chunk is converted into a vector representation using the Sentence Transformers model:

```text
all-MiniLM-L6-v2
```

The generated embeddings are stored in the SQLite database.

## 5. User Question

When a user asks a question, the question is converted into an embedding.

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
        ↓
Relevant Document Chunks
```

## 7. AI Generation

The retrieved document content is provided to the LLM through OpenRouter.

The LLM generates an answer using the retrieved document context.

## 8. Citations

Retrieved chunks contain page information.

The application uses this information to provide page-level citations and allow users to navigate to the relevant PDF page.

---

# Document Comparison

Astra Intel supports comparison between two selected documents.

```text
Document A
    │
    ▼
Extracted Content
    │
    ├──────────────┐
    │              │
    ▼              ▼
Comparison Engine
    ▲              ▲
    │              │
    └──────────────┤
                   │
Document B         │
    │              │
    ▼              │
Extracted Content ─┘
        │
        ▼
Comparison Result
        │
        ├── Similarities
        ├── Differences
        ├── New Information
        └── Removed Information
```

The comparison result is displayed directly inside the conversation interface.

---

# Technology Stack

## Frontend

- React
- Vite
- JavaScript
- CSS

## Backend

- Python
- Flask
- Flask-CORS

## AI / Machine Learning

- OpenRouter
- Sentence Transformers
- `all-MiniLM-L6-v2`
- Vector embeddings
- Retrieval-Augmented Generation
- Hybrid retrieval

## Document Processing

- PyMuPDF
- Tesseract OCR
- PDF text extraction
- Text chunking

## Database

- SQLite

---

# Project Structure

The project uses a single root directory rather than separate `backend` and `frontend` folders.

```text
ASTRA_INTEL-SAHIL_CHUGWANI/
│
├── data/
├── database/
├── dist/
├── public/
├── routes/
├── scripts/
├── services/
├── src/
├── uploads/
│
├── .env
├── .env.example
├── .gitignore
├── .oxlintrc.json
│
├── app.py
├── index.html
├── package.json
├── package-lock.json
├── requirement.txt
├── vite.config.js
│
├── test_document_embeddings.py
├── test_embeddings.py
├── test_retrieval.py
│
└── README.md
```

---

# Installation

## Prerequisites

Install the following before running Astra Intel:

- Python 3.x
- Node.js
- npm
- Tesseract OCR
- Git

---

# 1. Clone the Repository

Clone the repository:

```bash
git clone https://github.com/chugwanisahil-eng/ASTRA_INTEL-SAHIL_CHUGWANI.git
```

Enter the project directory:

```bash
cd ASTRA_INTEL-SAHIL_CHUGWANI
```

---

# 2. Create a Python Virtual Environment

From the project root:

```bash
python -m venv venv
```

## Windows

Activate the virtual environment:

```bash
venv\Scripts\activate
```

## Linux / macOS

```bash
source venv/bin/activate
```

---

# 3. Install Python Dependencies

The Python dependencies are listed in:

```text
requirement.txt
```

Install them using:

```bash
pip install -r requirement.txt
```

---

# 4. Configure the OpenRouter API Key

Create a `.env` file in the project root.

Add:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

Replace `your_openrouter_api_key` with your actual OpenRouter API key.

The project also contains:

```text
.env.example
```

which can be used as a reference for the required environment variables.


---

# 5. Install Tesseract OCR

Astra Intel uses Tesseract OCR for scanned and image-based PDF pages.

After installing Tesseract, verify the installation:

```bash
tesseract --version
```

If the installed Tesseract version is displayed, OCR is ready.

On Windows, make sure the Tesseract installation directory is available through the system PATH if required.

---

# 6. Install Frontend Dependencies

The frontend is located in the root project directory.

The project contains:

```text
package.json
package-lock.json
```

From the project root, run:

```bash
npm install
```

---

# Running Astra Intel

Astra Intel requires two development servers:

1. Flask backend
2. React/Vite frontend

Run them in separate terminals.

---

# Terminal 1 — Start the Backend

Make sure the Python virtual environment is activated.

From the project root:

```bash
python app.py
```

The Flask backend runs on:

```text
http://localhost:5000
```

Keep this terminal running.

---

# Terminal 2 — Start the Frontend

Open a second terminal.

Navigate to the project directory:

```bash
cd ASTRA_INTEL-SAHIL_CHUGWANI
```

Start the Vite development server:

```bash
npm run dev
```

Vite will display the local development URL.

Usually it is:

```text
http://localhost:5173
```

Open the displayed URL in your browser.

---

# Running the Application

Once both servers are running:

```text
┌───────────────────────────┐
│     React / Vite          │
│     localhost:5173        │
└─────────────┬─────────────┘
              │
              │ API Requests
              ▼
┌───────────────────────────┐
│       Flask Backend       │
│     localhost:5000        │
└─────────────┬─────────────┘
              │
              ▼
       SQLite Database
              │
              ▼
        AI / Retrieval
```

Open the frontend URL in your browser:

```text
http://localhost:5173
```

---

# Basic Usage

## Step 1 — Upload a PDF

Upload a PDF document through the Astra Intel interface.

## Step 2 — Wait for Processing

The system processes the document by:

1. Extracting text
2. Running OCR when necessary
3. Splitting content into chunks
4. Generating embeddings
5. Storing processed information
6. Making the document available for interaction

## Step 3 — Ask Questions

Select the document and ask questions about its contents.

The retrieval system finds relevant sections before the question is sent to the LLM.

## Step 4 — Verify Citations

AI responses can contain page citations.

Click a citation to navigate to the relevant page of the PDF.

## Step 5 — Generate a Summary

Use the document summary functionality to generate a concise overview of the uploaded document.

## Step 6 — Compare Documents

Select two documents and enable comparison mode.

The system generates:

- Similarities
- Differences
- New Information
- Removed Information

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

Returns available documents.

### Get Document File

```text
GET /api/documents/<id>/file
```

Returns the original PDF.

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

Returns available conversations.

### Create Conversation

```text
POST /api/conversations
```

Creates a new conversation.

### Get Conversation

```text
GET /api/conversations/<id>
```

Returns a conversation and its messages.

### Send Message

```text
POST /api/conversations/<id>/messages
```

Sends a question to the document intelligence system.

This endpoint supports normal document Q&A and document comparison.

### Rename Conversation

```text
PATCH /api/conversations/<id>
```

Renames a conversation.

### Delete Conversation

```text
DELETE /api/conversations/<id>
```

Deletes a conversation.

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

- Documents
- Document chunks
- Embeddings
- Conversations
- Messages
- Document summaries

This allows processed document information and conversations to persist between application sessions.

---

# Grounded AI

Astra Intel uses a retrieval-first approach.

Instead of directly sending the user's question to the language model, the system first retrieves relevant sections from the uploaded document.

```text
User Question
      │
      ▼
Generate Query Embedding
      │
      ▼
Hybrid Retrieval
      │
      ▼
Relevant Document Chunks
      │
      ▼
LLM Context
      │
      ▼
Generated Answer
      │
      ▼
Page Citations
```

This keeps the response connected to the source document and allows users to verify the information.

---

# Error Handling

Astra Intel handles situations such as:

- No document uploaded
- Invalid PDF
- Empty document
- Failed document processing
- OCR processing issues
- Missing API key
- Network/API errors
- No relevant information found
- Invalid comparison requests

---

# Example Question Answering Workflow

```text
Upload PDF
    │
    ▼
Document Processing
    │
    ▼
Text Extraction / OCR
    │
    ▼
Chunking
    │
    ▼
Embeddings
    │
    ▼
Ask Question
    │
    ▼
Hybrid Retrieval
    │
    ▼
Relevant Chunks
    │
    ▼
LLM Response
    │
    ▼
Page Citation
    │
    ▼
Verify Answer in PDF
```

---

# Example Document Comparison Workflow

```text
Upload Document A
        │
        ▼
Upload Document B
        │
        ▼
Select Both Documents
        │
        ▼
Enable Compare Mode
        │
        ▼
Send Comparison Request
        │
        ▼
Analyze Both Documents
        │
        ▼
┌─────────────────────────┐
│ Similarities            │
│ Differences             │
│ New Information         │
│ Removed Information     │
└─────────────────────────┘
```

---

# Security

API keys and other secrets should be stored in environment variables.

Do not commit the real `.env` file or API keys to GitHub.

The `.gitignore` file should contain entries such as:

```gitignore
.env
venv/
__pycache__/
*.pyc
uploads/
*.db
```

Use `.env.example` to document required environment variables without exposing secret values.

---

# Limitations

- AI response quality depends on the quality and structure of the uploaded documents.
- OCR accuracy depends on the quality of scanned pages.
- Very large documents may require additional retrieval and context optimization.
- LLM availability depends on the configured OpenRouter model and API limits.
- AI-generated responses should be verified against cited document pages when accuracy is important.

---

# Future Improvements

Possible future improvements include:

- Advanced retrieval reranking
- More precise citation highlighting
- Streaming AI responses
- Advanced multi-document question answering
- Improved OCR
- Local/open-source LLM support
- Exportable summaries and reports
- Advanced document analytics
- Improved large-document processing

---

# Project Objective

The objective of Astra Intel is to make complex PDF documents easier to understand and interact with.

Traditional document reading requires users to manually search through large amounts of content. Astra Intel combines:

- Document processing
- OCR
- Semantic search
- Hybrid retrieval
- Retrieval-Augmented Generation
- AI summarization
- Document comparison
- Persistent conversations
- Page-level citations

into a single platform.

The overall workflow is:

```text
Upload
   ↓
Process
   ↓
Understand
   ↓
Search
   ↓
Ask Questions
   ↓
Summarize
   ↓
Compare
   ↓
Verify with Citations
```

---

# Conclusion

Astra Intel combines modern AI, machine learning, and document-processing technologies to provide an interactive document intelligence platform.

The system allows users to upload PDF documents, ask questions, search for relevant information, generate summaries, compare documents, and verify AI-generated answers using page-level citations.

---

# Tech Stack Summary

| Category | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Backend | Flask |
| Language | Python / JavaScript |
| Database | SQLite |
| PDF Processing | PyMuPDF |
| OCR | Tesseract |
| Embeddings | Sentence Transformers |
| Embedding Model | all-MiniLM-L6-v2 |
| LLM Platform | OpenRouter |
| AI Architecture | RAG |
| Retrieval | Hybrid Semantic + Keyword Search |

---

# Astra Intel

### AI-Powered Document Intelligence Platform

Built with:

**React • Vite • Flask • Python • SQLite • PyMuPDF • Tesseract OCR • Sentence Transformers • OpenRouter**
