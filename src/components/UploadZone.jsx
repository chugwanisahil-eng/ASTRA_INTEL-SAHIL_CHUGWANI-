/**
 * Drag-and-drop PDF intake. Validates type/size locally, then calls uploadDocument.
 */
import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { ERROR_COPY } from '../api/client.js';
import '../styles/UploadZone.css';

const MAX = 25 * 1024 * 1024;

export default function UploadZone() {
  const { uploadDocument } = useApp();
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState(null);

  async function accept(file) {
    setError(null);
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError(ERROR_COPY.UNSUPPORTED_TYPE);
      return;
    }
    if (file.size > MAX) {
      setError(ERROR_COPY.FILE_TOO_LARGE);
      return;
    }
    try {
      await uploadDocument(file);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className={`upload-zone ${drag ? 'drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        accept(e.dataTransfer.files?.[0]);
      }}
    >
      <FileUp size={36} />
      <h2>Drop a defence PDF here</h2>
      <p>Chat stays empty until a document is indexed.</p>
      <div className="upload-reqs">PDF only · max 25 MB · text or scanned</div>
      {error ? <div className="upload-error">{error}</div> : null}
      <label className="chip-btn">
        Choose file
        <input
          className="file-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
