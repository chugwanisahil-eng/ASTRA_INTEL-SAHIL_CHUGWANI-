/**
 * Non-blocking top banner for backend/API-key failures.
 */
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import '../styles/ErrorBanner.css';

export default function ErrorBanner() {
  const { banner, setBanner } = useApp();
  if (!banner) return null;
  return (
    <div className="banner" role="status">
      <div>{banner.message}</div>
      <button type="button" aria-label="Dismiss banner" onClick={() => setBanner(null)}>
        <X size={16} />
      </button>
    </div>
  );
}
