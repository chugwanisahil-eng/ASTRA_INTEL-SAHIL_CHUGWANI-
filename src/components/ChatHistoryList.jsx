/**
 * Past conversations grouped by recency. Hover to rename or delete.
 */
import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import '../styles/ChatHistoryList.css';

function bucket(iso) {
  const d = new Date(iso);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startYest = new Date(startToday);
  startYest.setDate(startYest.getDate() - 1);
  if (d >= startToday) return 'Today';
  if (d >= startYest) return 'Yesterday';
  return 'Earlier';
}

export default function ChatHistoryList() {
  const {
    conversations,
    documents,
    activeConversation,
    openConversation,
    renameConversation,
    deleteConversation,
  } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');

  const groups = useMemo(() => {
    const order = ['Today', 'Yesterday', 'Earlier'];
    const map = { Today: [], Yesterday: [], Earlier: [] };
    conversations.forEach((c) => {
      map[bucket(c.updated_at)].push(c);
    });
    return order.filter((k) => map[k].length).map((k) => ({ label: k, items: map[k] }));
  }, [conversations]);

  function docLabel(ids) {
    return (ids || [])
      .map((id) => documents.find((d) => d.id === id)?.filename || id)
      .join(', ');
  }

  if (!conversations.length) {
    return <div className="doc-empty">No chats yet.</div>;
  }

  return (
    <div>
      {groups.map((group) => (
        <div className="history-group" key={group.label}>
          <div className="sidebar-section-label">{group.label}</div>
          {group.items.map((item) => (
            <div
              key={item.id}
              className={`history-item ${activeConversation?.id === item.id ? 'active' : ''}`}
            >
              {editingId === item.id ? (
                <input
                  value={draft}
                  aria-label="Rename conversation"
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    if (draft.trim()) renameConversation(item.id, draft.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <button type="button" className="history-main" onClick={() => openConversation(item.id)}>
                  <div className="history-title">{item.title}</div>
                  <div className="history-docs">{docLabel(item.document_ids) || 'No documents'}</div>
                </button>
              )}
              <div className="history-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Rename chat"
                  onClick={() => {
                    setEditingId(item.id);
                    setDraft(item.title);
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Delete chat"
                  onClick={() => deleteConversation(item.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
