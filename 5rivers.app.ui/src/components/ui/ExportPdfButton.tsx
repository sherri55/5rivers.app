import { useState } from 'react';

interface ExportPdfButtonProps {
  onExport: () => Promise<void>;
  label?: string;
}

export function ExportPdfButton({ onExport, label = 'Export PDF' }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await onExport();
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-surface-container-low hover:bg-surface-container ghost-border transition-colors disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-[16px]">
        {loading ? 'hourglass_empty' : 'picture_as_pdf'}
      </span>
      {loading ? 'Generating...' : label}
    </button>
  );
}
