/**
 * One chat turn.
 * Assistant side renders markdown, clickable page citations,
 * grounding, sources, and document comparison columns.
 */

import Markdown from 'react-markdown';
import {
  AlertCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';

import SourcesPanel from './SourcesPanel.jsx';

import { useApp } from '../context/AppContext.jsx';

import '../styles/MessageList.css';


export default function MessageBubble({
  message,
  onRetry,
  onRegenerate,
}) {

  const { scrollToPage } = useApp();

  const isUser = message.role === 'user';


  // =========================================================
  // COPY MESSAGE
  // =========================================================

  async function copyText() {

    let text = '';

    if (message.compare) {

      const compare = message.compare;

      text = [
        'SIMILARITIES',
        ...(Array.isArray(compare.similarities)
          ? compare.similarities
          : []),

        '',
        'DIFFERENCES',
        ...(Array.isArray(compare.differences)
          ? compare.differences
          : []),

        '',
        'NEW INFORMATION',
        ...(Array.isArray(compare.new_information)
          ? compare.new_information
          : []),

        '',
        'REMOVED INFORMATION',
        ...(Array.isArray(compare.removed_information)
          ? compare.removed_information
          : []),
      ].join('\n');

    } else {

      text =
        message.content ||
        message.error?.message ||
        '';
    }


    try {

      await navigator.clipboard.writeText(text);

    } catch {

      /*
       * Clipboard may be blocked by browser permissions.
       */

    }
  }


  // =========================================================
  // RENDER MARKDOWN
  // =========================================================

  function renderMarkdown(text) {

    /*
     * React Markdown requires a string.
     *
     * This protects the component if something unexpected
     * is passed to it.
     */

    const safeText =
      typeof text === 'string'
        ? text
        : String(text ?? '');


    return (
      <Markdown
        components={{

          p: ({ children }) => {

            const parts = Array.isArray(children)
              ? children
              : [children];


            return (
              <p>

                {parts.map((part, index) => {

                  /*
                   * Keep React/Markdown elements unchanged.
                   */

                  if (
                    typeof part !== 'string'
                  ) {
                    return part;
                  }


                  /*
                   * Split the text wherever [Page X] appears.
                   *
                   * This allows citations to work even when they
                   * appear in the middle of a sentence.
                   */

                  const pieces =
                    part.split(
                      /(\[Page\s+\d+\])/g
                    );


                  return pieces.map(
                    (
                      piece,
                      pieceIndex
                    ) => {

                      const match =
                        piece.match(
                          /^\[Page\s+(\d+)\]$/
                        );


                      /*
                       * Normal text
                       */

                      if (!match) {
                        return piece;
                      }


                      const page =
                        Number(match[1]);


                      /*
                       * Find the source belonging to this page.
                       *
                       * The source allows the PDF viewer to:
                       *
                       * 1. Open the correct page
                       * 2. Highlight the cited excerpt
                       * 3. Switch to the correct document
                       */

                      const source =
                        (message.sources || []).find(
                          (item) =>
                            Number(item.page) === page
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

                    }
                  );

                })}

              </p>
            );

          },

        }}
      >
        {safeText}
      </Markdown>
    );
  }


  // =========================================================
  // RENDER COMPARISON LIST
  // =========================================================

  function renderComparisonList(items) {

    /*
     * Make sure we always work with an array.
     */

    const safeItems =
      Array.isArray(items)
        ? items
        : [];


    /*
     * No information available.
     */

    if (safeItems.length === 0) {

      return (
        <p className="compare-empty">
          No significant information found.
        </p>
      );
    }


    return (
      <ul className="compare-list">

        {safeItems.map(
          (item, index) => (

            <li
              key={index}
              className="compare-item"
            >

              {renderMarkdown(
                String(item)
              )}

            </li>

          )
        )}

      </ul>
    );
  }


  // =========================================================
  // ERROR MESSAGE
  // =========================================================

  if (message.error) {

    return (
      <article className="msg">

        <div className="bubble msg-error">

          <div>
            {message.error.message}
          </div>


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


  // =========================================================
  // GROUNDING FAILURE
  // =========================================================

  if (
    !isUser &&
    message.supported === false
  ) {

    return (
      <article className="msg">

        <div
          className="msg-avatar"
          aria-hidden
        >
          A
        </div>


        <div className="bubble not-found">

          <div className="not-found-title">

            <AlertCircle size={16} />

            Not found in document

          </div>


          <p>
            {message.content}
          </p>


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


  // =========================================================
  // NORMAL MESSAGE / COMPARISON MESSAGE
  // =========================================================

  return (
    <article
      className={`msg ${
        isUser ? 'user' : ''
      }`}
    >

      {!isUser ? (

        <div
          className="msg-avatar"
          aria-hidden
        >
          A
        </div>

      ) : null}


      <div className="bubble">


        {/* =================================================
            COMPARISON
            ================================================= */}

        {message.compare ? (

          <div className="compare-grid">


            {/* =============================================
                SIMILARITIES
                ============================================= */}

            <div className="compare-col">

              <h4>
                Similarities
              </h4>


              {renderComparisonList(
                message.compare.similarities
              )}

            </div>


            {/* =============================================
                DIFFERENCES
                ============================================= */}

            <div className="compare-col">

              <h4>
                Differences
              </h4>


              {renderComparisonList(
                message.compare.differences
              )}

            </div>


            {/* =============================================
                NEW INFORMATION
                ============================================= */}

            <div className="compare-col">

              <h4>
                New Information
              </h4>


              {renderComparisonList(
                message.compare.new_information
              )}

            </div>


            {/* =============================================
                REMOVED INFORMATION
                ============================================= */}

            <div className="compare-col">

              <h4>
                Removed Information
              </h4>


              {renderComparisonList(
                message.compare.removed_information
              )}

            </div>


          </div>


        ) : (

          /* =================================================
             NORMAL MESSAGE
             ================================================= */

          <div className="md">

            {isUser
              ? (
                message.content
              )
              : (
                renderMarkdown(
                  message.content
                )
              )}

          </div>

        )}


        {/* =================================================
            ASSISTANT TOOLS
            ================================================= */}

        {!isUser ? (

          <>

            <SourcesPanel
              sources={
                message.sources || []
              }
            />


            <div className="msg-tools">


              {/* COPY */}

              <button
                type="button"
                className="icon-btn"
                aria-label="Copy answer"
                onClick={copyText}
              >

                <Copy size={14} />

              </button>


              {/* REGENERATE */}

              <button
                type="button"
                className="icon-btn"
                aria-label="Regenerate answer"
                onClick={onRegenerate}
              >

                <RefreshCw size={14} />

              </button>


              {/* GROUNDING */}

              <span
                className={`grounding ${
                  message.grounding ||
                  'medium'
                }`}
              >

                {message.grounding ||
                  'medium'}{' '}

                grounding

              </span>


            </div>

          </>

        ) : null}


      </div>

    </article>
  );
}