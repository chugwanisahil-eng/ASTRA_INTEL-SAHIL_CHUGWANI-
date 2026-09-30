/**
 * App shell: banner, wordmark, mobile tabs, sidebar / PDF / resizable chat.
 */
import { useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';
import Sidebar from './components/Sidebar.jsx';
import PdfViewer from './components/PdfViewer.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import './styles/global.css';

function Shell() {
  const { mobileTab, setMobileTab, sidebarCollapsed, chatWidth, setChatWidth } = useApp();
  const widthRef = useRef(chatWidth);
  widthRef.current = chatWidth;

  function startResize(event) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;
    function move(ev) {
      const next = Math.min(640, Math.max(320, startWidth + (startX - ev.clientX)));
      setChatWidth(next);
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <div className="app-root">
      <ErrorBanner />
      <header className="app-chrome">
        <div className="wordmark">
          <div className="logo-slot" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </div>
          <span className="wordmark-text">ASTRA INTEL</span>
        </div>
        <nav className="mobile-tabs" aria-label="Panels">
          {[
            ['documents', 'Documents'],
            ['viewer', 'Viewer'],
            ['chat', 'Chat'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-selected={mobileTab === id}
              onClick={() => setMobileTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div
        className={`app-body ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}
        data-mobile-tab={mobileTab}
      >
        <Sidebar />
        <PdfViewer />
        <div
          className="resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setChatWidth((w) => Math.min(640, w + 16));
            if (e.key === 'ArrowRight') setChatWidth((w) => Math.max(320, w - 16));
          }}
        />
        <ChatPanel />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
