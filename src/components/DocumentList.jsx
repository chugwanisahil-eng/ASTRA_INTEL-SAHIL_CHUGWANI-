/**
 * Document list. Click selects the viewer target; checkbox marks docs for multi/compare chat.
 */
import { Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import StatusBadge from './StatusBadge.jsx';
import '../styles/DocumentList.css';

export default function DocumentList() {
  const {
    documents,
    activeDocumentId,
    setActiveDocumentId,
    selectedIds,
    toggleSelected,
    deleteDocument,
    setMobileTab,
  } = useApp();

  if (!documents.length) {
    return <div className="doc-empty">No documents yet. Upload a PDF to begin.</div>;
  }

  return (
    <div className="doc-list">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`doc-row ${doc.id === activeDocumentId ? 'active' : ''}`}
        >
          <input
            type="checkbox"
            aria-label={`Include ${doc.filename} in queries`}
            checked={selectedIds.includes(doc.id)}
            onChange={() => toggleSelected(doc.id)}
          />
          <button
            type="button"
            className="history-main"
            onClick={() => {
              setActiveDocumentId(doc.id);
              setMobileTab('viewer');
            }}
          >
            <div className="doc-meta">
              <div className="doc-name">{doc.filename}</div>
              <div className="doc-sub">
                <span>{doc.pages ? `${doc.pages} pp` : '—'}</span>
                <StatusBadge status={doc.status} />
              </div>
            </div>
          </button>
          <button
            type="button"
            className="icon-btn doc-delete"
            aria-label={`Delete ${doc.filename}`}
            onClick={() => deleteDocument(doc.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
