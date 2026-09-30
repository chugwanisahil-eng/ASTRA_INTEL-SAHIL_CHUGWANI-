/**
 * Scrollable multi-turn history plus typing indicator while sendQuestion is in flight.
 */
import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import MessageBubble from './MessageBubble.jsx';
import '../styles/MessageList.css';

export default function MessageList({ onRetry, onRegenerate }) {
  const { activeConversation, sending, documents } = useApp();
  const endRef = useRef(null);
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  if (!documents.length) {
    return (
      <div className="chat-empty">
        Upload a PDF first. The composer stays disabled until a document is ready.
      </div>
    );
  }

  if (!messages.length && !sending) {
    return (
      <div className="chat-empty">
        Ask about the open document, or run a comparison once two files are checked.
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <MessageBubble
          key={msg.id || index}
          message={msg}
          onRetry={() => onRetry(msg, index)}
          onRegenerate={() => onRegenerate(msg, index)}
        />
      ))}
      {sending ? (
        <div className="typing" aria-label="Assistant is thinking">
          <i /><i /><i />
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
