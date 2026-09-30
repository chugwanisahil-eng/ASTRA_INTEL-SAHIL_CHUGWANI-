/**
 * Composer: Enter sends, Shift+Enter newline. Disabled until a Ready document exists.
 */
import { useState } from 'react';
import { Send } from 'lucide-react';
import ModeToggle from './ModeToggle.jsx';
import '../styles/ChatInput.css';

export default function ChatInput({ disabled, reason, selectedCount, mode, onMode, onSend }) {
  const [value, setValue] = useState('');

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  }

  return (
    <div className="chat-input">
      <textarea
        value={value}
        disabled={disabled}
        placeholder={reason || 'Ask about the selected document…'}
        aria-label="Question"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="chat-input-row">
        <ModeToggle mode={mode} onChange={onMode} selectedCount={selectedCount} />
        <button type="button" className="send-btn" disabled={disabled || !value.trim()} onClick={submit}>
          <Send size={14} /> Send
        </button>
      </div>
      {disabled ? <div className="input-hint">{reason}</div> : <div className="input-hint">Enter to send · Shift+Enter for a new line</div>}
    </div>
  );
}
