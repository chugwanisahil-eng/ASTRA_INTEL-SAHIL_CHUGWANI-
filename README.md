# ASTRA INTEL (frontend)

React + Vite UI for chatting with defence PDFs. All network traffic goes through `src/api/client.js`.

```bash
npm install
npm run dev
```

Mock mode is on by default (`VITE_USE_MOCK=true` in `.env`). Point at FastAPI later:

```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000
```
