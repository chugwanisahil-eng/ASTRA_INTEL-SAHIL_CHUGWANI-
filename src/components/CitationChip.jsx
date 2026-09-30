/**
 * Citation chip: jumps to the exact source page in the PDF viewer.
 */
import { useApp } from '../context/AppContext.jsx';
import '../styles/CitationChip.css';

export default function CitationChip({ source }) {
  const { scrollToPage } = useApp();

  const excerpt = source.excerpt || source.snippet || '';

  const label = source.document_name
    ? `${source.document_name.replace('.pdf', '')}, p.${source.page}`
    : `p.${source.page}`;

  return (
    <button
      type="button"
      className="cite-chip"
      data-tip={excerpt}
      onClick={() => {
        scrollToPage(
          source.page,
          excerpt,
          source.document_id
        );
      }}
    >
      [{label}]
    </button>
  );
}