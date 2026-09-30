/**
 * Ask this document / all selected / compare. Compare needs 2+ checked files.
 */
import '../styles/ModeToggle.css';
import '../styles/ChatInput.css';

const MODES = [
  { id: 'single', label: 'Ask this document' },
  { id: 'multi', label: 'Ask all selected documents' },
  { id: 'compare', label: 'Compare documents' },
];

export default function ModeToggle({ mode, onChange, selectedCount }) {
  return (
    <div className="mode-toggle mode-toggle-wrap" role="group" aria-label="Question mode">
      {MODES.map((item) => {
        const disabled = item.id === 'compare' && selectedCount < 2;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            disabled={disabled}
            title={disabled ? 'Select at least two documents' : item.label}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
