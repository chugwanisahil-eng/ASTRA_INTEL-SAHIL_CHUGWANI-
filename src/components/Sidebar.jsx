/**
 * Left column: new chat, documents, upload, history, theme + health.
 */
import {
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Upload
} from 'lucide-react';

import { useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import DocumentList from './DocumentList.jsx';
import ChatHistoryList from './ChatHistoryList.jsx';
import '../styles/Sidebar.css';

export default function Sidebar() {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    newChat,
    uploadDocument,
    theme,
    setTheme,
    healthOk,
  } = useApp();

  const fileInputRef = useRef(null);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      await uploadDocument(file);
    } catch (error) {
      console.error('Upload failed:', error);
    }

    // Allow selecting the same file again
    event.target.value = '';
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn collapse-btn"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => setSidebarCollapsed((v) => !v)}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen size={16} />
        ) : (
          <PanelLeftClose size={16} />
        )}
      </button>

      <aside className={`sidebar panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-inner">

          <div className="sidebar-top">

            <button
              type="button"
              className="new-chat-btn"
              onClick={newChat}
            >
              <Plus size={16} />
              New chat
            </button>

            <button
              type="button"
              className="new-chat-btn"
              onClick={handleUploadClick}
            >
              <Upload size={16} />
              Upload PDF
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

          </div>

          <div className="sidebar-scroll">

            <div className="sidebar-section-label">
              Documents
            </div>

            <DocumentList />

            <div className="sidebar-section-label">
              Chat history
            </div>

            <ChatHistoryList />

          </div>

          <div className="sidebar-footer">

            <button
              type="button"
              className="icon-btn"
              aria-label={
                theme === 'dark'
                  ? 'Switch to light theme'
                  : 'Switch to dark theme'
              }
              onClick={() =>
                setTheme(theme === 'dark' ? 'light' : 'dark')
              }
            >
              {theme === 'dark' ? (
                <Sun size={16} />
              ) : (
                <Moon size={16} />
              )}
            </button>

            <div className={`health-dot ${healthOk ? 'ok' : ''}`}>
              <span />
              Backend {healthOk ? 'online' : 'offline'}
            </div>

          </div>
        </div>
      </aside>
    </>
  );
}