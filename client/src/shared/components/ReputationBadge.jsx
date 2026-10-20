import { ShieldCheck } from 'lucide-react';

export default function ReputationBadge({ reputation, compact = false }) {
  if (!reputation) return null;
  return <span className="sg-reputation-badge" title={reputation.explanation}>
    <ShieldCheck size={14} aria-hidden="true" />
    {reputation.score == null ? 'Chưa đủ dữ liệu uy tín' : `Uy tín ${reputation.score}/100`}
    {!compact && <span>({reputation.verified_attended} buổi xác minh)</span>}
  </span>;
}
