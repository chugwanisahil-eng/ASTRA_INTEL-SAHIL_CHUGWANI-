/**
 * Status pill for ingest pipeline states returned by the API.
 */
import '../styles/StatusBadge.css';

const LABELS = {
  uploading: 'Uploading',
  processing: 'Processing',
  ocr_in_progress: 'OCR in progress',
  ready: 'Ready',
  failed: 'Failed',
};

export default function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  return <span className={`badge ${key}`}>{LABELS[key] || status || 'Unknown'}</span>;
}
