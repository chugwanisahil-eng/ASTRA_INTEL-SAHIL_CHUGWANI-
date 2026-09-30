/**
 * Center pane: react-pdf continuous viewer.
 * Citation clicks jump to the correct page and highlight the cited text.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { useApp } from '../context/AppContext.jsx';
import UploadZone from './UploadZone.jsx';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '../styles/PdfViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;


/* =========================================================
   TEXT NORMALIZATION
   ========================================================= */

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[\u00ad]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/* =========================================================
   FIND PDF TEXT LAYER
   ========================================================= */

function getTextLayer(pageNode) {
  if (!pageNode) return null;

  return (
    pageNode.querySelector('.react-pdf__Page__textContent') ||
    pageNode.querySelector('.textLayer')
  );
}


/* =========================================================
   HIGHLIGHT CITED TEXT
   ========================================================= */

function highlightSnippet(pageNode, snippet) {
  if (!pageNode || !snippet) {
    return false;
  }

  const layer = getTextLayer(pageNode);

  if (!layer) {
    return false;
  }

  /* Remove previous highlights */
  layer.querySelectorAll('.cite-highlight').forEach((el) => {
    el.classList.remove('cite-highlight');
  });

  const needle = normalize(snippet);

  if (!needle) {
    return false;
  }

  const spans = Array.from(layer.querySelectorAll('span'));

  if (!spans.length) {
    return false;
  }

  /*
   * Build normalized continuous text from PDF spans.
   */
  let haystack = '';
  const map = [];

  spans.forEach((span) => {
    const piece = normalize(span.textContent);

    if (!piece) return;

    if (haystack) {
      haystack += ' ';
    }

    const start = haystack.length;

    haystack += piece;

    map.push({
      start,
      end: haystack.length,
      span,
    });
  });

  if (!haystack) {
    return false;
  }

  let index = haystack.indexOf(needle);
  let matchLength = needle.length;


  /* =====================================================
     TRY SHORTER EXCERPTS
     ===================================================== */

  if (index === -1) {
    const words = needle
      .split(/\s+/)
      .filter(Boolean);

    const lengths = [
      20,
      15,
      12,
      10,
      8,
      6,
      5,
      4,
    ];

    for (const length of lengths) {
      if (words.length < length) continue;

      const candidate = words
        .slice(0, length)
        .join(' ');

      const candidateIndex =
        haystack.indexOf(candidate);

      if (candidateIndex !== -1) {
        index = candidateIndex;
        matchLength = candidate.length;
        break;
      }
    }
  }


  /* =====================================================
     LAST FALLBACK — INDIVIDUAL IMPORTANT WORD
     ===================================================== */

  if (index === -1) {
    const words = needle
      .split(/\s+/)
      .filter((word) => word.length >= 5);

    for (const word of words) {
      const candidateIndex =
        haystack.indexOf(word);

      if (candidateIndex !== -1) {
        index = candidateIndex;
        matchLength = word.length;
        break;
      }
    }
  }


  /* =====================================================
     NOTHING FOUND
     ===================================================== */

  if (index === -1) {
    return false;
  }


  /* =====================================================
     APPLY HIGHLIGHT
     ===================================================== */

  const endIndex = index + matchLength;

  let highlighted = false;

  map.forEach((item) => {
    if (
      item.end > index &&
      item.start < endIndex
    ) {
      item.span.classList.add('cite-highlight');
      highlighted = true;
    }
  });


  /* =====================================================
     SCROLL HIGHLIGHT INTO VIEW
     ===================================================== */

  if (highlighted) {
    const first = layer.querySelector(
      '.cite-highlight'
    );

    first?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return highlighted;
}


/* =========================================================
   PDF VIEWER
   ========================================================= */

export default function PdfViewer() {
  const {
    documents,
    activeDocument,
    pdfUrl,
    pdfError,
    setPdfError,
    viewerApiRef,
    deleteDocument,
    refreshDocuments,
    citeTarget,
  } = useApp();

  const scrollRef = useRef(null);
  const pageEls = useRef({});
  const highlightRef = useRef(null);

  const highlightTimers = useRef([]);
  const observers = useRef({});

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [pageInput, setPageInput] = useState('1');


  /* =========================================================
     CLEAR TIMERS
     ========================================================= */

  const clearHighlightTimers = useCallback(() => {
    highlightTimers.current.forEach((timer) => {
      window.clearTimeout(timer);
    });

    highlightTimers.current = [];
  }, []);


  /* =========================================================
     APPLY HIGHLIGHT
     ========================================================= */

  const applyHighlight = useCallback((pageNumber) => {
    const target = highlightRef.current;
    const node = pageEls.current[pageNumber];

    if (!target || !node) {
      return false;
    }

    if (Number(target.page) !== Number(pageNumber)) {
      return false;
    }

    if (!target.text) {
      return false;
    }

    return highlightSnippet(
      node,
      target.text
    );
  }, []);


  /* =========================================================
     WATCH TEXT LAYER
     ========================================================= */

  const watchPageForHighlight = useCallback(
    (pageNumber) => {
      const node = pageEls.current[pageNumber];

      if (!node) {
        return;
      }

      /* Remove old observer for this page */
      if (observers.current[pageNumber]) {
        observers.current[pageNumber].disconnect();
      }

      const tryHighlight = () => {
        const success =
          applyHighlight(pageNumber);

        if (success) {
          if (observers.current[pageNumber]) {
            observers.current[pageNumber].disconnect();
            delete observers.current[pageNumber];
          }

          return true;
        }

        return false;
      };


      /* Try immediately */
      if (tryHighlight()) {
        return;
      }


      /*
       * Watch the page DOM.
       *
       * This handles cases where react-pdf creates
       * the text layer after the page callback fires.
       */
      const observer = new MutationObserver(() => {
        if (tryHighlight()) {
          observer.disconnect();

          if (
            observers.current[pageNumber] === observer
          ) {
            delete observers.current[pageNumber];
          }
        }
      });

      observer.observe(node, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      observers.current[pageNumber] = observer;


      /*
       * Safety timeout.
       */
      window.setTimeout(() => {
        observer.disconnect();

        if (
          observers.current[pageNumber] === observer
        ) {
          delete observers.current[pageNumber];
        }
      }, 5000);
    },
    [applyHighlight]
  );


  /* =========================================================
     RETRY HIGHLIGHT
     ========================================================= */

  const retryHighlight = useCallback(
    (pageNumber) => {
      clearHighlightTimers();

      const delays = [
        50,
        150,
        300,
        500,
        800,
        1200,
        1800,
      ];

      delays.forEach((delay) => {
        const timer = window.setTimeout(() => {
          const success =
            applyHighlight(pageNumber);

          if (success) {
            clearHighlightTimers();
          }
        }, delay);

        highlightTimers.current.push(timer);
      });

      /*
       * Also observe the actual DOM.
       */
      watchPageForHighlight(pageNumber);
    },
    [
      applyHighlight,
      clearHighlightTimers,
      watchPageForHighlight,
    ]
  );


  /* =========================================================
     SCROLL TO PAGE
     ========================================================= */

  const scrollToPage = useCallback(
    (pageNumber, highlightText) => {
      const requestedPage =
        Number(pageNumber) || 1;

      const clamped = Math.min(
        Math.max(1, requestedPage),
        numPages || requestedPage
      );


      /*
       * Save citation information.
       */
      highlightRef.current = {
        page: clamped,
        text: highlightText || '',
      };


      clearHighlightTimers();

      setPage(clamped);
      setPageInput(String(clamped));


      /*
       * Scroll to page.
       */
      const node =
        pageEls.current[clamped];

      if (node) {
        node.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }


      /*
       * Start highlighting.
       */
      if (highlightText) {
        retryHighlight(clamped);
      }
    },
    [
      numPages,
      retryHighlight,
      clearHighlightTimers,
    ]
  );


  /* =========================================================
     REGISTER VIEWER API
     ========================================================= */

  useEffect(() => {
    viewerApiRef.current.scrollToPage =
      scrollToPage;

    return () => {
      clearHighlightTimers();

      Object.values(observers.current)
        .forEach((observer) => {
          observer?.disconnect();
        });

      observers.current = {};
    };
  }, [
    scrollToPage,
    viewerApiRef,
    clearHighlightTimers,
  ]);


  /* =========================================================
     CITATION FROM APP CONTEXT
     ========================================================= */

  useEffect(() => {
    if (
      !citeTarget ||
      !pdfUrl ||
      !numPages ||
      !activeDocument
    ) {
      return;
    }

    /*
     * Ignore citation from another document.
     */
    if (
      citeTarget.documentId &&
      citeTarget.documentId !== activeDocument.id
    ) {
      return;
    }

    scrollToPage(
      citeTarget.page,
      citeTarget.text
    );
  }, [
    citeTarget,
    pdfUrl,
    numPages,
    activeDocument?.id,
    scrollToPage,
  ]);


  /* =========================================================
     TEXT LAYER CALLBACK
     ========================================================= */

  const handleTextLayerSuccess = useCallback(
    (pageNumber) => {
      /*
       * Start DOM observer because the text spans may
       * still be getting inserted.
       */
      watchPageForHighlight(pageNumber);

      /*
       * Also perform normal retries.
       */
      retryHighlight(pageNumber);
    },
    [
      watchPageForHighlight,
      retryHighlight,
    ]
  );


  /* =========================================================
     PAGE VISIBILITY
     ========================================================= */

  useEffect(() => {
    const root = scrollRef.current;

    if (!root) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter(
              (entry) =>
                entry.isIntersecting
            )
            .sort(
              (a, b) =>
                b.intersectionRatio -
                a.intersectionRatio
            )[0];

          if (!visible) return;

          const n = Number(
            visible.target.dataset.page
          );

          setPage(n);
          setPageInput(String(n));
        },
        {
          root,
          threshold: 0.35,
        }
      );

    Object.values(pageEls.current)
      .forEach((el) => {
        if (el) {
          observer.observe(el);
        }
      });

    return () => observer.disconnect();
  }, [numPages, pdfUrl]);


  /* =========================================================
     FIT WIDTH
     ========================================================= */

  function fitWidth() {
    const width =
      scrollRef.current?.clientWidth ||
      800;

    setScale(
      Math.max(
        0.6,
        (width - 48) / 612
      )
    );
  }


  /* =========================================================
     EMPTY STATE
     ========================================================= */

  if (!documents.length) {
    return (
      <main className="pdf-pane panel">
        <UploadZone />
      </main>
    );
  }


  /* =========================================================
     PROCESSING STATE
     ========================================================= */

  if (
    activeDocument &&
    activeDocument.status !== 'ready' &&
    activeDocument.status !== 'failed'
  ) {
    return (
      <main className="pdf-pane panel">
        <div className="pdf-status">
          <h2>
            Preparing{' '}
            {activeDocument.filename}
          </h2>

          <p>
            Questions stay disabled until
            this file is Ready.
          </p>

          <div className="processing-bar">
            <i />
          </div>
        </div>
      </main>
    );
  }


  /* =========================================================
     ERROR STATE
     ========================================================= */

  if (
    activeDocument?.status === 'failed' ||
    pdfError
  ) {
    return (
      <main className="pdf-pane panel">
        <div className="pdf-fail">
          <h3>
            Couldn&apos;t read this file
          </h3>

          <p>
            {pdfError?.message ||
              'The PDF looks empty or damaged.'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              className="chip-btn"
              onClick={() => {
                setPdfError(null);
                refreshDocuments();
              }}
            >
              <RotateCcw size={14} />
              Retry
            </button>

            {activeDocument ? (
              <button
                type="button"
                className="chip-btn"
                onClick={() =>
                  deleteDocument(
                    activeDocument.id
                  )
                }
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </main>
    );
  }


  /* =========================================================
     NO ACTIVE DOCUMENT
     ========================================================= */

  if (
    !activeDocument ||
    !pdfUrl
  ) {
    return (
      <main className="pdf-pane panel">
        <UploadZone />
      </main>
    );
  }


  /* =========================================================
     MAIN VIEWER
     ========================================================= */

  return (
    <main className="pdf-pane panel">

      <div className="pdf-toolbar">

        <div className="pdf-filename">
          {activeDocument.filename}
        </div>


        <button
          type="button"
          className="icon-btn"
          aria-label="Previous page"
          onClick={() =>
            scrollToPage(page - 1)
          }
        >
          <ChevronLeft size={16} />
        </button>


        <input
          className="pdf-page-input"
          aria-label="Page number"
          value={pageInput}
          onChange={(e) =>
            setPageInput(e.target.value)
          }
          onBlur={() =>
            scrollToPage(
              Number(pageInput)
            )
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              scrollToPage(
                Number(pageInput)
              );
            }
          }}
        />


        <span className="pdf-page-ind">
          Page {page} / {numPages || '—'}
        </span>


        <button
          type="button"
          className="icon-btn"
          aria-label="Next page"
          onClick={() =>
            scrollToPage(page + 1)
          }
        >
          <ChevronRight size={16} />
        </button>


        <button
          type="button"
          className="icon-btn"
          aria-label="Zoom out"
          onClick={() =>
            setScale((s) =>
              Math.max(
                0.5,
                s - 0.1
              )
            )
          }
        >
          <ZoomOut size={16} />
        </button>


        <button
          type="button"
          className="icon-btn"
          aria-label="Zoom in"
          onClick={() =>
            setScale((s) =>
              Math.min(
                2.4,
                s + 0.1
              )
            )
          }
        >
          <ZoomIn size={16} />
        </button>


        <button
          type="button"
          className="icon-btn"
          aria-label="Fit to width"
          onClick={fitWidth}
        >
          <Maximize2 size={16} />
        </button>

      </div>


      <div
        className="pdf-scroll"
        ref={scrollRef}
      >

        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            setPage(1);
            setPageInput('1');
          }}
          onLoadError={() =>
            setPdfError({
              code: 'CORRUPT_PDF',
              message:
                "Couldn't read this file.",
            })
          }
          loading={
            <div className="pdf-status">
              Loading PDF…
            </div>
          }
        >

          {Array.from(
            { length: numPages },
            (_, i) => i + 1
          ).map((n) => (

            <div
              key={n}
              className="pdf-page-wrap"
              data-page={n}
              ref={(el) => {
                pageEls.current[n] =
                  el;
              }}
            >

              <Page
                pageNumber={n}
                scale={scale}
                renderAnnotationLayer
                renderTextLayer

                onRenderTextLayerSuccess={() =>
                  handleTextLayerSuccess(n)
                }
              />

            </div>

          ))}

        </Document>

      </div>


      {activeDocument.ocr_used ? (
        <div className="ocr-badge">
          Scanned document, text recovered
          via OCR
        </div>
      ) : null}

    </main>
  );
}