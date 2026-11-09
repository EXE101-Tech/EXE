import { ChevronLeft, ChevronRight } from 'lucide-react';

const buttonClass = 'inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return <div className="mt-4 flex items-center justify-center gap-3">
    <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} className={buttonClass}>
      <ChevronLeft className="h-3.5 w-3.5" /> Trước
    </button>
    <span className="text-xs font-bold text-slate-400">Trang {page}/{totalPages}</span>
    <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} className={buttonClass}>
      Sau <ChevronRight className="h-3.5 w-3.5" />
    </button>
  </div>;
}
