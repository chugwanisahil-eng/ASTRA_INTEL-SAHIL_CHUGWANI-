/**
 * Semantic search tab: POST /search, then open the matching document + page.
 */
import { useState } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import '../styles/SearchPanel.css';

export default function SearchPanel() {
  const { selectedIds, documents, scrollToPage } = useApp();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [busy, setBusy] = useState(false);

  async function run(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    try {
      const ids = selectedIds.length ? selectedIds : documents.map((d) => d.id);
      const res = await api.search({ query, document_ids: ids });
      setHits(res);
    } catch {
      setHits([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="search-panel">
      <form className="search-box" onSubmit={run}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search passages across selected documents"
          aria-label="Semantic search"
        />
      </form>
      <div className="search-results">
        {busy ? <p className="chat-empty">Searching…</p> : null}
        {!busy && !hits.length ? <p className="chat-empty">Ranked passages will appear here.</p> : null}
        {hits.map((hit, i) => (
          <button
            type="button"
            className="search-hit"
            key={`${hit.document_id}-${hit.page}-${i}`}
            onClick={() => {
              scrollToPage(hit.page, hit.snippet, hit.document_id);
            }}
          >
            <div className="search-hit-meta">
              <span>{hit.document_name} · p.{hit.page}</span>
              <span>{Math.round(hit.score * 100)}%</span>
            </div>
            <div>{hit.snippet}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
