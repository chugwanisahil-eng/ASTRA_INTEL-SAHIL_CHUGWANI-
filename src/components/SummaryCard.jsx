import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileText,
  Lightbulb,
  Tags,
  BookOpen
} from 'lucide-react';

import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';

import '../styles/SummaryCard.css';


export default function SummaryCard() {

  const {
    activeDocument,
    scrollToPage
  } = useApp();

  const [open, setOpen] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);


  useEffect(() => {

    let cancelled = false;

    async function loadSummary() {

      if (
        !activeDocument ||
        activeDocument.status !== 'ready'
      ) {
        setData(null);
        return;
      }

      setLoading(true);

      try {

        const res = await api.getSummary(
          activeDocument.id
        );

        if (!cancelled) {
          setData(res);
        }

      } catch (error) {

        console.error(
          'SUMMARY ERROR:',
          error
        );

        if (!cancelled) {
          setData(null);
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };

  }, [activeDocument, tick]);


  if (!activeDocument) {
    return null;
  }


  return (
    <section className="summary-card">

      {/* HEADER */}

      <button
        type="button"
        className="summary-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >

        <span className="summary-title">
          <FileText size={16} />
          Document Summary
        </span>

        {open ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}

      </button>


      {open && (

        <div className="summary-body">

          {/* LOADING */}

          {loading ? (

            <div className="summary-loading">

              <div className="skel" />

              <div className="skel w80" />

              <div className="skel w60" />

              <div className="skel w80" />

            </div>

          ) : (

            <>

              {/* OVERVIEW */}

              <div className="summary-section">

                <div className="summary-section-title">

                  <FileText size={14} />

                  <span>Overview</span>

                </div>

                <p className="summary-text">
                  {data?.summary ||
                    'Summary will appear when the document is ready.'}
                </p>

              </div>


              {/* KEY POINTS */}

              {data?.key_points?.length > 0 && (

                <div className="summary-section">

                  <div className="summary-section-title">

                    <Lightbulb size={14} />

                    <span>Key Points</span>

                  </div>

                  <ul className="summary-points">

                    {data.key_points.map(
                      (point, index) => (

                        <li key={index}>
                          {point}
                        </li>

                      )
                    )}

                  </ul>

                </div>

              )}


              {/* ENTITIES */}

              {data?.entities?.length > 0 && (

                <div className="summary-section">

                  <div className="summary-section-title">

                    <Tags size={14} />

                    <span>Important Entities</span>

                  </div>

                  <div className="entity-chips">

                    {data.entities.map(
                      (entity, index) => (

                        <span
                          key={`${entity.type}-${entity.text}-${index}`}
                          className="entity-chip"
                        >

                          <em>
                            {entity.type}
                          </em>

                          {entity.text}

                        </span>

                      )
                    )}

                  </div>

                </div>

              )}


              {/* SOURCES */}

              {data?.citations?.length > 0 && (

                <div className="summary-section">

                  <div className="summary-section-title">

                    <BookOpen size={14} />

                    <span>Sources</span>

                  </div>


                  <div className="summary-sources">

                    {data.citations.map(
                      (citation, index) => (

                        <button
                          type="button"
                          className="summary-source"
                          key={`${citation.page}-${index}`}
                          onClick={() =>
                            scrollToPage(
                              citation.page,
                              citation.excerpt,
                              activeDocument.id
                            )
                          }
                        >

                          <span className="source-page">
                            Page {citation.page}
                          </span>

                          <span className="source-excerpt">
                            {citation.excerpt}
                          </span>

                        </button>

                      )
                    )}

                  </div>

                </div>

              )}


              {/* REGENERATE */}

              <div className="summary-actions">

                <button
                  type="button"
                  className="chip-btn"
                  onClick={async () => {
  if (!activeDocument) return;

  setLoading(true);

  try {
    const result = await api.regenerateSummary(
      activeDocument.id
    );

    setData(result);
  } catch (error) {
    console.error(
      'SUMMARY REGENERATION ERROR:',
      error
    );
  } finally {
    setLoading(false);
  }
}}
                >

                  <RefreshCw size={12} />

                  Regenerate

                </button>

              </div>

            </>

          )}

        </div>

      )}

    </section>
  );
}