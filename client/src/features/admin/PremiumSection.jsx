import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, History, Hourglass, Image, Search } from 'lucide-react';
import MediaPreviewModal from '../../shared/components/MediaPreviewModal';
import { adminService } from '../../shared/services/api';
import Pagination from './Pagination';

const views = [
  { id: 'pending', label: 'Chờ kiểm duyệt', icon: Clock3 },
  { id: 'active', label: 'Đang kích hoạt', icon: CheckCircle2 },
  { id: 'expired', label: 'Đã hết hạn', icon: Hourglass },
  { id: 'history', label: 'Lịch sử giao dịch', icon: History },
];
const emptyText = {
  pending: 'Chưa có giao dịch chờ duyệt.',
  active: 'Chưa có tài khoản Premium đang kích hoạt.',
  expired: 'Chưa có tài khoản Premium hết hạn.',
  history: 'Chưa có giao dịch ở trạng thái này.',
};
const PAGE_SIZE = 5;
const controlClass = 'rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-100';
const actionClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50';
const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
});

function formatDate(value) {
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
  return dateFormat.format(date);
}

function searchKey(value) {
  return value?.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd') ?? '';
}

export default function PremiumSection({ payments, accounts, onReview, onRevoke, onReload }) {
  const [view, setView] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState('APPROVED');
  const [remoteData, setRemoteData] = useState(null);
  const [remoteAttempt, setRemoteAttempt] = useState(0);
  const [preview, setPreview] = useState(null);
  const [rejection, setRejection] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isHistory = view === 'history';
  const isExpired = view === 'expired';
  const isRemote = isHistory || isExpired;
  useEffect(() => {
    if (!isRemote) return;
    const controller = new AbortController();
    const request = isHistory
      ? adminService.getPayments(historyStatus, controller.signal)
      : adminService.getPremiumAccounts('expired', controller.signal);
    request.then((items) => {
      if (!controller.signal.aborted) setRemoteData({ items });
    }).catch(() => {
      if (!controller.signal.aborted) setRemoteData({ error: true });
    });
    return () => controller.abort();
  }, [isRemote, isHistory, historyStatus, remoteAttempt]);

  const isActive = view === 'active';
  const isAccount = isActive || isExpired;
  const items = isRemote ? remoteData?.items : isActive ? accounts : payments;
  const counts = { pending: payments?.length, active: accounts?.length, expired: isExpired ? items?.length : undefined };
  const isLoading = isRemote && !remoteData;
  const query = searchKey(search.trim());
  const matching = (items ?? []).filter((item) => [item.user_name, item.user_email, item.payment_code ?? item.last_payment_code]
    .some((value) => searchKey(value).includes(query)));
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeView(nextView) {
    if (nextView === view) return;
    setView(nextView);
    setPage(1);
    setRejection(null);
    setRemoteData(null);
  }

  function retry() {
    if (!isRemote) return save(onReload);
    setRemoteData(null);
    setRemoteAttempt((current) => current + 1);
  }

  async function save(action) {
    setIsSaving(true);
    try {
      if (await action()) setRejection(null);
    } finally {
      setIsSaving(false);
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]" aria-labelledby="premium-admin-title">
    <div className="space-y-4 border-b border-white/10 px-4 py-4">
      <h2 id="premium-admin-title" className="text-lg font-black">Quản lý Premium</h2>
      <div role="tablist" aria-label="Quản lý Premium" className="flex flex-wrap gap-1.5">
        {views.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={view === id} disabled={isSaving} onClick={() => changeView(id)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-60 ${view === id ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'}`}>
          <Icon aria-hidden="true" className="h-4 w-4" /> {label}{counts[id] != null && ` (${counts[id]})`}
        </button>)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-slate-300 sm:min-w-64">
          Tìm theo tên, email hoặc mã giao dịch
          <Search aria-hidden="true" className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" />
          <input type="search" value={search} onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }} className={`${controlClass} pl-9`} />
        </label>
        {isHistory && <label className="flex flex-col gap-1 text-xs font-semibold text-slate-300">
          Trạng thái giao dịch
          <select value={historyStatus} onChange={(event) => {
            setHistoryStatus(event.target.value);
            setRemoteData(null);
            setPage(1);
          }} className={controlClass}>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </label>}
      </div>
    </div>
    <div role="tabpanel" aria-label={views.find(({ id }) => id === view).label}>
      {isLoading ? <p role="status" className="px-4 py-6 text-sm text-slate-400">Đang tải dữ liệu Premium…</p> :
        !items ? <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-6 text-sm text-rose-300">
          Không thể tải dữ liệu Premium.
          <button type="button" disabled={isSaving} onClick={retry} className={`${actionClass} border-white/15 text-slate-100`}>Thử lại</button>
        </div> :
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-400">
            <span>{matching.length} kết quả</span>
            {isHistory && items.length === 200 && <span>Đang xem 200 giao dịch gần nhất theo trạng thái.</span>}
          </div>
          {visible.length === 0 && <p className="border-t border-white/10 px-4 py-6 text-sm text-slate-400">
            {query && items.length ? 'Không tìm thấy kết quả khớp.' : emptyText[view]}
          </p>}
          {visible.map((item) => {
            const code = isAccount ? item.last_payment_code : item.payment_code;
            const proofUrl = isAccount ? item.last_payment_proof_url : item.proof_url;
            const amount = isAccount ? item.last_payment_amount : item.amount;
            const submittedAt = isAccount ? item.last_payment_submitted_at : item.submitted_at;
            const rejected = item.status === 'REJECTED';
            return <article key={isAccount ? item.user_id : item.id} className="space-y-3 border-t border-white/10 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="break-words font-bold">{item.user_name}</h3>
                  <p className="break-all text-xs text-slate-400">{item.user_email}</p>
                  {isActive && <p className="text-sm font-semibold text-emerald-300">Kích hoạt đến {formatDate(item.premium_until)}</p>}
                  {isExpired && <p className="text-sm font-semibold text-amber-300">Hết hạn lúc {formatDate(item.premium_until)}</p>}
                  {isHistory && <p className={`text-sm font-semibold ${rejected ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {rejected ? 'Đã từ chối' : 'Đã duyệt'}{item.reviewed_at && ` lúc ${formatDate(item.reviewed_at)}`}
                  </p>}
                  {code && <p className="break-all text-sm text-indigo-200">{code}{amount != null && ` · ${amount.toLocaleString('vi-VN')} đ`}</p>}
                  {submittedAt && <p className="text-xs text-slate-400">Gửi lúc {formatDate(submittedAt)}</p>}
                  {isHistory && item.review_note && <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{item.review_note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {proofUrl && <button type="button" onClick={() => setPreview({ url: proofUrl, alt: `Ảnh chuyển khoản ${code || item.user_name}` })} className={`${actionClass} border-white/15 text-slate-200 hover:bg-white/10`}>
                    <Image aria-hidden="true" className="h-4 w-4" /> Xem ảnh chuyển khoản
                  </button>}
                  {isActive && <button type="button" disabled={isSaving} onClick={() => save(() => onRevoke(item))} className={`${actionClass} border-rose-400/40 text-rose-300 hover:bg-rose-500/10`}>Hủy kích hoạt</button>}
                  {view === 'pending' && <>
                    <button type="button" disabled={isSaving} onClick={() => setRejection({ id: item.id, note: '' })} className={`${actionClass} border-rose-400/40 text-rose-300 hover:bg-rose-500/10`}>Từ chối</button>
                    <button type="button" disabled={isSaving} onClick={() => {
                      if (window.confirm(`Duyệt giao dịch ${code} và kích hoạt Premium cho ${item.user_name}?`)) {
                        save(() => onReview(item, 'APPROVED'));
                      }
                    }} className={`${actionClass} border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700`}>Duyệt và kích hoạt</button>
                  </>}
                </div>
              </div>
              {view === 'pending' && rejection?.id === item.id && <form onSubmit={(event) => {
                event.preventDefault();
                save(() => onReview(item, 'REJECTED', rejection.note.trim()));
              }} className="space-y-2 rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  Lý do từ chối (không bắt buộc)
                  <textarea maxLength={500} rows={2} value={rejection.note} disabled={isSaving} onChange={(event) => setRejection({ ...rejection, note: event.target.value })} className={controlClass} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={isSaving} onClick={() => setRejection(null)} className={`${actionClass} border-white/15 text-slate-200`}>Quay lại</button>
                  <button type="submit" disabled={isSaving} className={`${actionClass} border-rose-400/40 text-rose-300`}>Xác nhận từ chối</button>
                </div>
              </form>}
            </article>;
          })}
          {totalPages > 1 && <div className="border-t border-white/10 pb-4"><Pagination page={currentPage} totalPages={totalPages} onChange={setPage} /></div>}
        </>}
    </div>
    {preview && <MediaPreviewModal src={preview.url} alt={preview.alt} onClose={() => setPreview(null)} />}
  </section>;
}
