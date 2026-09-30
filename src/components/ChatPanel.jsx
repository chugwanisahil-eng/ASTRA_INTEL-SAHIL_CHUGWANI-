/**
 * Right pane: summary, chat vs search, quick actions, messages, composer.
 */
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import SummaryCard from './SummaryCard.jsx';
import MessageList from './MessageList.jsx';
import ChatInput from './ChatInput.jsx';
import SearchPanel from './SearchPanel.jsx';
import '../styles/ChatPanel.css';

const QUICK = [];

function previousUserText(messages, index) {
  for (let i = index; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return messages[i].content;
  }
  return '';
}

export default function ChatPanel() {
  const {
    documents,
    activeDocument,
    selectedIds,
    sendQuestion,
    sending,
    chatWidth,
    activeConversation,
  } = useApp();
  const [tab, setTab] = useState('chat');
  const [mode, setMode] = useState('single');

  const selectedReady = documents.filter((d) => selectedIds.includes(d.id) && d.status === 'ready');
  const canAsk = Boolean(documents.length && activeDocument?.status === 'ready');
  const messages = activeConversation?.messages || [];

  const reason = useMemo(() => {
    if (!documents.length) return 'Upload a document to start asking questions.';
    if (activeDocument && activeDocument.status !== 'ready') {
      return 'This document is still processing. Questions unlock when status is Ready.';
    }
    return '';
  }, [documents.length, activeDocument]);

  async function send(text) {
    const resolvedMode = mode === 'compare' && selectedReady.length < 2 ? 'single' : mode;
    await sendQuestion(text, resolvedMode).catch(() => {});
  }

  return (
    <section className="chat-pane panel" style={{ width: chatWidth }}>
      <div className="chat-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>
          Chat
        </button>
        <button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>
          Semantic search
        </button>
      </div>
      {tab === 'search' ? (
        <SearchPanel />
      ) : (
        <div className="chat-body">
          <SummaryCard />
          
          <MessageList
            onRetry={(_msg, index) => {
              const q = previousUserText(messages, index);
              if (q) send(q);
            }}
            onRegenerate={(_msg, index) => {
              const q = previousUserText(messages, index);
              if (q) send(q);
            }}
          />
          <ChatInput
            disabled={!canAsk || sending}
            reason={reason}
            selectedCount={selectedIds.length}
            mode={mode}
            onMode={setMode}
            onSend={send}
          />
        </div>
      )}
    </section>
  );
}
