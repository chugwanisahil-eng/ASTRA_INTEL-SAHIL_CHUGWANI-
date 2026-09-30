/**
 * Expandable retrieved-passage list with relevance bars. Clicking a row uses the same viewer jump as chips.
 */
import CitationChip from './CitationChip.jsx';
import { useApp } from '../context/AppContext.jsx';
import '../styles/SourcesPanel.css';
import '../styles/CitationChip.css';

export default function SourcesPanel({ sources = [] }) {
  const { scrollToPage } = useApp();
  if (!sources.length) return null;
  return (
    <div className="sources-panel">
      <div className="sources-row">
        {sources.map((s, i) => (
          <CitationChip key={`${s.document_id}-${s.page}-${i}`} source={s} />
        ))}
      </div>
      <details className="passages">
        <summary>View retrieved passages</summary>
        {sources.map((s, i) => (
          <button
            type="button"
            className="passage"
            key={`p-${s.document_id}-${s.page}-${i}`}
            onClick={() => {
              scrollToPage(s.page, s.snippet, s.document_id);
            }}
          >
            <div className="passage-meta">
              <span>{s.document_name} · p.{s.page}</span>
              <span>{Math.round((s.score || 0) * 100)}%</span>
            </div>
            <div className="score-bar">
              <i style={{ width: `${Math.round((s.score || 0) * 100)}%` }} />
            </div>
            <p>{s.snippet}</p>
          </button>
        ))}
      </details>
    </div>
  );
}
