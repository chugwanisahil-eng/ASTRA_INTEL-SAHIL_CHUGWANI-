/**
 * One chat turn. Assistant side renders markdown, clickable page citations,
 * grounding, sources, and compare columns.
 */
import Markdown from 'react-markdown';
import { AlertCircle, Copy, RefreshCw } from 'lucide-react';
import SourcesPanel from './SourcesPanel.jsx';
import { useApp } from '../context/AppContext.jsx';
import '../styles/MessageList.css';

export default function MessageBubble({ message, onRetry, onRegenerate }) {
  const { scrollToPage } = useApp();
  const isUser = message.role === 'user';

  async function copyText() {
    const text = message.content || message.error?.message || '';

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be blocked */
    }
  }

  function renderMarkdown(text) {
    return (
      <Markdown
        components={{
          p: ({ children }) => {
            const parts = Array.isArray(children) ? children : [children];

            return (
              <p>
                {parts.map((part, index) => {
                  // Keep React/Markdown elements unchanged
                  if (typeof part !== 'string') {
                    return part;
                  }

                  /*
                   * Split the text wherever [Page X] appears.
                   * This allows citations to work even when they are
                   * in the middle of a sentence.
                   */
                  const pieces = part.split(/(\[Page\s+\d+\])/g);

                  return pieces.map((piece, pieceIndex) => {
                    const match = piece.match(/^\[Page\s+(\d+)\]$/);

                    // Normal text
                    if (!match) {
                      return piece;
                    }

                    const page = Number(match[1]);

                    /*
                     * Find the source belonging to this page so that
                     * the PDF viewer knows what text to highlight.
                     */
                    const source = (message.sources || []).find(
                      (item) => Number(item.page) === page
                    );

                    const excerpt =
                      source?.excerpt ||
                      source?.snippet ||
                      '';

                    return (
                      <button
                        key={`${index}-${pieceIndex}`}
                        type="button"
                        className="cite-chip"
                        onClick={() => {
                          scrollToPage(
                            page,
                            excerpt,
                            source?.document_id
                          );
                        }}
                      >
                        [Page {page}]
                      </button>
                    );
                  });
                })}
              </p>
            );
          },
        }}
      >
        {text}
      </Markdown>
    );
  }

  /*
   * Error message
   */
  if (message.error) {
    return (
      <article className="msg">
        <div className="bubble msg-error">
          <div>{message.error.message}</div>

          <div className="msg-tools">
            <button
              type="button"
              className="chip-btn"
              onClick={onRetry}
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        </div>
      </article>
    );
  }

  /*
   * Grounding failure / information not found
   */
  if (!isUser && message.supported === false) {
    return (
      <article className="msg">
        <div className="msg-avatar" aria-hidden>
          A
        </div>

        <div className="bubble not-found">
          <div className="not-found-title">
            <AlertCircle size={16} />
            Not found in document
          </div>

          <p>{message.content}</p>

          <div className="msg-tools">
            <span
              className={`grounding ${
                message.grounding || 'low'
              }`}
            >
              {message.grounding || 'low'} grounding
            </span>
          </div>
        </div>
      </article>
    );
  }

  /*
   * Normal chat message
   */
  return (
    <article className={`msg ${isUser ? 'user' : ''}`}>
      {!isUser ? (
        <div className="msg-avatar" aria-hidden>
          A
        </div>
      ) : null}

      <div className="bubble">
        {message.compare ? (
          <div className="compare-grid">
            <div className="compare-col">
              <h4>Similarities</h4>

              <div className="md">
                {renderMarkdown(
                  message.compare.similarities
                )}
              </div>
            </div>

            <div className="compare-col">
              <h4>Differences</h4>

              <div className="md">
                {renderMarkdown(
                  message.compare.differences
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="md">
            {isUser
              ? message.content
              : renderMarkdown(message.content)}
          </div>
        )}

        {!isUser ? (
          <>
            <SourcesPanel sources={message.sources} />

            <div className="msg-tools">
              <button
                type="button"
                className="icon-btn"
                aria-label="Copy answer"
                onClick={copyText}
              >
                <Copy size={14} />
              </button>

              <button
                type="button"
                className="icon-btn"
                aria-label="Regenerate answer"
                onClick={onRegenerate}
              >
                <RefreshCw size={14} />
              </button>

              <span
                className={`grounding ${
                  message.grounding || 'medium'
                }`}
              >
                {message.grounding || 'medium'} grounding
              </span>
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}