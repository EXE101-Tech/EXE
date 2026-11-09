import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, ClipboardList, FileText, Gamepad2, LogOut, Play, Shield, Trash2, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { adminService, gameRoomService, resolveMediaUrl, socialPostService, teamService } from '../../shared/services/api';
import MediaPreviewModal from '../../shared/components/MediaPreviewModal';
import { formatStoredCost } from '../../shared/utils/price';
import Pagination from './Pagination';
import PremiumSection from './PremiumSection';

const tabs = [
  { id: 'payments', label: 'Quản lý Premium', icon: ClipboardList },
  { id: 'content', label: 'Kiểm duyệt nội dung', icon: Shield },
  { id: 'occurred', label: 'Trận đã diễn ra', icon: CheckCircle2 },
  { id: 'accounts', label: 'Tài khoản admin', icon: Users },
  { id: 'users', label: 'Danh sách tài khoản', icon: UserRound },
  { id: 'deletions', label: 'Yêu cầu xoá', icon: Trash2 },
  { id: 'reports', label: 'Báo cáo', icon: Shield },
];

const PAGE_SIZE = 5;
const vietnamOffsetMs = 7 * 60 * 60 * 1000;
const occurredPeriods = { all: 'Tất cả', '7': '7 ngày qua', '30': '30 ngày qua', month: 'Tháng này' };
const matchDateFormat = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

function matchDate(value) {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
}

function filterOccurredRooms(rooms, period) {
  if (!rooms || period === 'all') return rooms;
  const now = Date.now();
  const today = new Date(now + vietnamOffsetMs);
  const firstDay = period === 'month' ? 1 : today.getUTCDate() - Number(period) + 1;
  const from = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), firstDay) - vietnamOffsetMs;
  return rooms.filter((room) => {
    const start = matchDate(room.start_time).getTime();
    return start >= from && start <= now;
  });
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('payments');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState(null);
  const [premiumAccounts, setPremiumAccounts] = useState(null);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [teams, setTeams] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '' });
  const [contentView, setContentView] = useState('posts');
  const [usersPage, setUsersPage] = useState(1);
  const [occurredHistory, setOccurredHistory] = useState({ rooms: null, error: false });
  const [occurredPeriod, setOccurredPeriod] = useState('all');
  const [occurredAttempt, setOccurredAttempt] = useState(0);

  const loadPremium = useCallback(async () => {
    const [paymentsResult, premiumAccountsResult] = await Promise.allSettled([
      adminService.getPayments('PENDING'),
      adminService.getPremiumAccounts(),
    ]);
    setPayments(paymentsResult.status === 'fulfilled' ? paymentsResult.value : null);
    setPremiumAccounts(premiumAccountsResult.status === 'fulfilled' ? premiumAccountsResult.value : null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [summaryResult, accountsResult, usersResult, postsResult, roomsResult, teamsResult, deletionResult, reportsResult] = await Promise.allSettled([
      adminService.getSummary(),
      adminService.getAccounts(),
      adminService.getUsers(),
      adminService.getPosts(),
      adminService.getRooms(),
      teamService.getAll(),
      adminService.getDeletionRequests(),
      adminService.getReports(),
      loadPremium(),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    if (accountsResult.status === 'fulfilled') setAccounts(accountsResult.value);
    if (usersResult.status === 'fulfilled') setUsers(usersResult.value);
    if (postsResult.status === 'fulfilled') setPosts(postsResult.value);
    if (roomsResult.status === 'fulfilled') setRooms(roomsResult.value);
    if (teamsResult.status === 'fulfilled') setTeams(teamsResult.value);
    if (deletionResult.status === 'fulfilled') setDeletionRequests(deletionResult.value);
    if (reportsResult.status === 'fulfilled') setReports(reportsResult.value);
    setLoading(false);
  }, [loadPremium]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (tab !== 'occurred') return;
    const controller = new AbortController();
    adminService.getOccurredRooms(controller.signal).then((rooms) => {
      if (!controller.signal.aborted) setOccurredHistory({ rooms, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setOccurredHistory((current) => ({ ...current, error: true }));
    });
    return () => controller.abort();
  }, [tab, occurredAttempt]);

  const refreshSummary = async (notice) => {
    try {
      setSummary(await adminService.getSummary());
      setMessage(notice);
    } catch {
      setMessage(`${notice} Tải lại trang để cập nhật số liệu.`);
    }
  };

  const review = async (payment, status, note) => {
    try {
      await adminService.reviewPayment(payment.id, { status, review_note: note || null });
    } catch (error) {
      setMessage(error.message || 'Không thể cập nhật giao dịch.');
      return false;
    }
    setPayments((current) => current?.filter((item) => item.id !== payment.id) ?? null);
    const summaryUpdate = refreshSummary(status === 'APPROVED' ? 'Đã duyệt và kích hoạt Premium.' : 'Đã từ chối giao dịch.');
    if (status === 'APPROVED') {
      try {
        setPremiumAccounts(await adminService.getPremiumAccounts());
      } catch {
        setPremiumAccounts(null);
      }
    }
    await summaryUpdate;
    return true;
  };

  const revokePremium = async (account) => {
    if (!window.confirm(`Hủy kích hoạt Premium của ${account.user_name || account.user_email}?`)) return;
    try {
      await adminService.revokePremium(account.user_id);
      setPremiumAccounts((current) => current?.filter((item) => item.user_id !== account.user_id) ?? null);
      await refreshSummary(`Đã hủy kích hoạt Premium của ${account.user_name || account.user_email}.`);
    } catch (error) { setMessage(error.message || 'Không thể hủy kích hoạt Premium.'); }
  };

  const removePremiumRows = (userId) => {
    setPremiumAccounts((current) => current?.filter((item) => item.user_id !== userId) ?? null);
    setPayments((current) => current?.filter((item) => item.user_id !== userId) ?? null);
  };

  const removeUser = async (account) => {
    if (!window.confirm(`Xóa tài khoản ${account.profile?.full_name || account.email}? Tài khoản sẽ không thể đăng nhập lại.`)) return;
    try {
      await adminService.deleteUser(account.id);
      setUsers((current) => current.filter((item) => item.id !== account.id));
      removePremiumRows(account.id);
      await refreshSummary(`Đã xóa tài khoản ${account.profile?.full_name || account.email}.`);
    } catch (error) { setMessage(error.message || 'Không thể xóa tài khoản.'); }
  };

  const removeAdmin = async (account) => {
    if (account.id === user?.id) {
      setMessage('Không thể xóa tài khoản quản trị đang đăng nhập.');
      return;
    }
    if (!window.confirm(`Xóa tài khoản admin ${account.profile?.full_name || account.email}? Tài khoản sẽ không thể đăng nhập lại.`)) return;
    try {
      await adminService.deleteAccount(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setMessage(`Đã xóa tài khoản admin ${account.profile?.full_name || account.email}.`);
    } catch (error) { setMessage(error.message || 'Không thể xóa tài khoản admin.'); }
  };

  const remove = async (type, id) => {
    try {
      if (type === 'post') { await socialPostService.remove(id); setPosts((current) => current.filter((item) => item.id !== id)); }
      if (type === 'room') { await gameRoomService.remove(id); setRooms((current) => current.filter((item) => item.id !== id)); }
      if (type === 'team') { await teamService.remove(id); setTeams((current) => current.filter((item) => item.id !== id)); }
      setMessage('Đã xóa nội dung.');
    } catch (error) { setMessage(error.message || 'Không thể xóa nội dung.'); }
  };

  const createAccount = async (event) => {
    event.preventDefault();
    try {
      const account = await adminService.createAccount(accountForm);
      setAccounts((current) => [...current, account]);
      setAccountForm({ name: '', email: '', password: '' });
      setMessage('Đã cấp tài khoản admin mới.');
    } catch (error) { setMessage(error.message || 'Không thể tạo tài khoản admin.'); }
  };

  const completeDeletion = async (request) => {
    if (!window.confirm(`Xử lý yêu cầu xoá dữ liệu của ${request.email}?`)) return;
    try {
      await adminService.completeDeletionRequest(request.id);
      setDeletionRequests((current) => current.filter((item) => item.id !== request.id));
      setUsers((current) => current.filter((item) => item.id !== request.user_id));
      removePremiumRows(request.user_id);
      await refreshSummary('Đã xử lý yêu cầu xoá tài khoản.');
    } catch (error) { setMessage(error.message || 'Không thể xử lý yêu cầu xoá.'); }
  };

  const reviewReport = async (report, status) => {
    try {
      await adminService.reviewReport(report.id, { status, action: status === 'RESOLVED' ? 'reviewed' : 'dismissed' });
      setReports((current) => current.filter((item) => item.id !== report.id));
      setMessage(status === 'RESOLVED' ? 'Đã xử lý báo cáo.' : 'Đã bỏ qua báo cáo.');
    } catch (error) { setMessage(error.message || 'Không thể cập nhật báo cáo.'); }
  };

  const usersTotalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentUsersPage = Math.min(usersPage, usersTotalPages);
  const visibleUsers = users.slice((currentUsersPage - 1) * PAGE_SIZE, currentUsersPage * PAGE_SIZE);
  const filteredOccurredRooms = filterOccurredRooms(occurredHistory.rooms, occurredPeriod);
  const occurredCount = filteredOccurredRooms?.length ?? (occurredPeriod === 'all' ? summary?.rooms_occurred : undefined);
  const premiumRevenue = summary?.premium_revenue;
  const stats = [
    ['Người dùng', summary?.users],
    ['Bài viết', summary?.posts],
    ['CLB', summary?.teams],
    ['Phòng', summary?.rooms],
    ['Trận đã diễn ra', occurredCount, () => setTab('occurred')],
    ['Chờ duyệt', summary?.pending_payments],
    ['Đăng ký thành công', summary?.premium_subscriptions],
    ['Premium còn hạn', summary?.premium_active],
    ['Tổng tiền Premium đã duyệt', premiumRevenue != null ? `${premiumRevenue.toLocaleString('vi-VN')} đ` : undefined],
  ];

  return <main className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-[1500px] items-center justify-between border-b border-white/10 pb-5">
      <div><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-500/20 p-2 text-indigo-300"><Shield className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">SportGo Admin</p><h1 className="text-2xl font-black">Trung tâm kiểm duyệt</h1></div></div><p className="mt-2 text-sm text-slate-400">Đăng nhập: {user?.email}</p></div>
      <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"><LogOut className="h-4 w-4" /> Đăng xuất</button>
    </header>
    <section aria-label="Thống kê quản trị" className="mx-auto mt-6 grid max-w-[1500px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(([label, value, open]) => {
        const cardClass = 'rounded-2xl border border-white/10 bg-white/[0.04] p-4';
        const content = <>
          <span className="block text-xs text-slate-400">{label}</span>
          <span className="mt-1 block break-words text-2xl font-black tabular-nums">{value ?? '—'}</span>
        </>;
        return open ? (
          <button key={label} type="button" onClick={open} className={`${cardClass} text-left hover:bg-indigo-500/15 focus-visible:outline-2 focus-visible:outline-indigo-400`}>
            {content}
            {occurredPeriod !== 'all' && <span className="block text-xs text-slate-400">{occurredPeriods[occurredPeriod]}</span>}
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300">
              Xem danh sách <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          </button>
        ) : <div key={label} className={cardClass}>{content}</div>;
      })}
    </section>
    <nav className="mx-auto mt-6 flex max-w-[1500px] gap-2 overflow-x-auto border-b border-white/10 pb-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/10'}`}><Icon className="h-4 w-4" /> {label}</button>)}</nav>
    {message && <div role="status" className="mx-auto mt-4 max-w-[1500px] rounded-xl bg-indigo-500/15 px-4 py-3 text-sm text-indigo-200">{message}</div>}
    {loading ? <div className="mx-auto mt-8 max-w-[1500px] text-slate-400">Đang tải dữ liệu quản trị...</div> : <section className="mx-auto mt-6 grid max-w-[1500px] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-3">
        {tab === 'occurred' && <OccurredMatches
          rooms={filteredOccurredRooms}
          period={occurredPeriod}
          onPeriodChange={setOccurredPeriod}
          hasError={occurredHistory.error}
          onRetry={() => {
            setOccurredHistory((current) => ({ ...current, error: false }));
            setOccurredAttempt((current) => current + 1);
          }}
        />}
        {tab === 'reports' && <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="mb-4 font-black">Báo cáo đang chờ xử lý ({reports.length})</h2>{reports.length === 0 ? <Empty text="Chưa có báo cáo mới." /> : <div className="space-y-2">{reports.map((report) => <div key={report.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-3"><div className="min-w-0"><p className="font-bold">{report.target_type} #{report.target_id} · {report.reason}</p><p className="mt-1 text-xs text-slate-400">{report.details || 'Không có mô tả thêm'} · {new Date(report.created_at).toLocaleString('vi-VN')}</p></div><div className="flex gap-2"><button type="button" onClick={() => reviewReport(report, 'DISMISSED')} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-300">Bỏ qua</button><button type="button" onClick={() => reviewReport(report, 'RESOLVED')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Đã xử lý</button></div></div>)}</div>}</section>}
        {tab === 'deletions' && <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="mb-4 font-black">Yêu cầu xoá tài khoản ({deletionRequests.length})</h2>{deletionRequests.length === 0 ? <Empty text="Chưa có yêu cầu xoá đang chờ xử lý." /> : <div className="space-y-2">{deletionRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-3"><div className="min-w-0"><p className="font-bold">{request.email}</p><p className="mt-1 text-xs text-slate-400">{new Date(request.created_at).toLocaleString('vi-VN')}{request.reason ? ` · ${request.reason}` : ''}</p></div><button type="button" onClick={() => completeDeletion(request)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /> Xoá sau khi xác minh</button></div>)}</div>}</section>}
        {tab === 'payments' && <PremiumSection
          payments={payments}
          accounts={premiumAccounts}
          onReview={review}
          onRevoke={revokePremium}
          onReload={loadPremium}
        />}
        {tab === 'content' && <div className="space-y-5">
          <div role="tablist" aria-label="Danh mục kiểm duyệt" className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <button type="button" role="tab" aria-selected={contentView === 'posts'} onClick={() => setContentView('posts')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${contentView === 'posts' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}><FileText className="h-4 w-4" /> Bài viết ({posts.length})</button>
            <button type="button" role="tab" aria-selected={contentView === 'rooms'} onClick={() => setContentView('rooms')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${contentView === 'rooms' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}><Gamepad2 className="h-4 w-4" /> Phòng chơi ({rooms.length})</button>
            <button type="button" role="tab" aria-selected={contentView === 'teams'} onClick={() => setContentView('teams')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${contentView === 'teams' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}><Users className="h-4 w-4" /> CLB ({teams.length})</button>
          </div>
          {contentView === 'posts' && <div role="tabpanel" aria-label="Danh sách bài viết"><ContentList title="Bài viết" icon={FileText} items={posts} getLabel={(item) => `${item.author_name}: ${item.content || 'Bài có ảnh/video'}`} getMedia={(item) => item.media_url ? { src: item.media_url, type: item.media_type, alt: `Media trong bài viết của ${item.author_name}` } : null} onDelete={(item) => remove('post', item.id)} /></div>}
          {contentView === 'rooms' && <div role="tabpanel" aria-label="Danh sách phòng chơi"><ContentList title="Phòng chơi" icon={Gamepad2} items={rooms} getLabel={(item) => `${item.title} · ${item.host?.profile?.full_name || item.host?.email || 'Chủ phòng'}`} onDelete={(item) => remove('room', item.id)} /></div>}
          {contentView === 'teams' && <div role="tabpanel" aria-label="Danh sách CLB"><ContentList title="CLB" icon={Users} items={teams} getLabel={(item) => `${item.name} · ${item.owner_name || 'Chủ CLB'}`} getMedia={(item) => item.image_url ? { src: item.image_url, type: 'image', alt: `Ảnh bìa CLB ${item.name}` } : null} onDelete={(item) => remove('team', item.id)} /></div>}
        </div>}        {tab === 'accounts' && <>{accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div><p className="font-bold">{account.profile?.full_name || account.email}</p><p className="text-xs text-slate-400">{account.email}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">Admin</span>{account.id === user?.id ? <span className="text-xs text-slate-500">Tài khoản hiện tại</span> : <button type="button" onClick={() => removeAdmin(account)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /> Xóa tài khoản</button>}</div></div>)}</>}        {tab === 'users' && <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-black"><UserRound className="h-4 w-4 text-indigo-300" /> Danh sách tài khoản ({users.length})</h2><span className="text-xs text-slate-400">Tài khoản admin được bảo vệ</span></div>{users.length === 0 ? <Empty text="Chưa có tài khoản người dùng." /> : <div className="space-y-2">{visibleUsers.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-3"><div className="min-w-0"><p className="font-bold">{account.profile?.full_name || 'Chưa cập nhật'} <span className="font-normal text-slate-400">({account.email})</span></p><p className="mt-1 text-xs text-slate-400">Tham gia {new Date(account.created_at).toLocaleDateString('vi-VN')}{account.is_premium ? ` · Premium đến ${new Date(account.premium_until).toLocaleDateString('vi-VN')}` : ''}</p></div><button type="button" onClick={() => removeUser(account)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /> Xóa tài khoản</button></div>)}</div>}{users.length > 0 && <Pagination page={currentUsersPage} totalPages={usersTotalPages} onChange={setUsersPage} />}</section>}
      </div>
      <aside className="space-y-4">
        {tab === 'accounts' && <form onSubmit={createAccount} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="font-black">Cấp tài khoản admin</h2><div className="mt-3 space-y-2">{[['name', 'Họ tên'], ['email', 'Email'], ['password', 'Mật khẩu']].map(([field, label]) => <input key={field} required type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} placeholder={label} value={accountForm[field]} onChange={(event) => setAccountForm((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />)}</div><button type="submit" className="mt-3 w-full rounded-xl bg-indigo-500 px-3 py-2.5 text-sm font-bold">Cấp tài khoản</button></form>}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400"><p className="font-bold text-slate-200">Quyền của admin</p><p className="mt-2">Tài khoản quản trị chỉ xem và kiểm duyệt. Like, bình luận, tạo bài, tạo phòng, tạo CLB và tham gia nội dung bị chặn ở backend.</p></div>
      </aside>
    </section>}
  </main>;
}

function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">{text}</div>; }

function OccurredMatches({ rooms, period, onPeriodChange, hasError, onRetry }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((rooms?.length ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRooms = rooms?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <h2 className="flex items-center gap-2 font-black">
      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
      Trận đã diễn ra{rooms && ` (${rooms.length})`}
    </h2>
    <p className="mb-4 mt-1 text-sm text-slate-400">Các trận đã được xác minh qua hệ thống điểm danh.</p>
    <label className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-300">
      Khoảng thời gian
      <select value={period} onChange={(event) => {
        onPeriodChange(event.target.value);
        setPage(1);
      }} className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-100">
        {['all', '7', '30', 'month'].map((option) => <option key={option} value={option}>{occurredPeriods[option]}</option>)}
      </select>
    </label>
    {hasError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-rose-300">
      Không thể tải danh sách trận.
      <button type="button" className="rounded-lg border border-white/15 px-3 py-2 text-slate-100" onClick={onRetry}>Thử lại</button>
    </div>}
    {!hasError && !rooms && <p role="status" className="text-sm text-slate-400">Đang tải danh sách trận…</p>}
    {rooms?.length === 0 && <Empty text={period === 'all' ? 'Chưa có trận nào được xác minh đã diễn ra.' : 'Không có trận đã xác minh trong khoảng thời gian này.'} />}
    <div className="space-y-2">
      {visibleRooms?.map((room) => <OccurredMatch key={room.id} room={room} />)}
    </div>
    <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
  </section>;
}

function OccurredMatch({ room }) {
  const [isOpen, setIsOpen] = useState(false);
  const startTime = matchDateFormat.format(matchDate(room.start_time));
  const fields = [
    ['Bắt đầu', startTime],
    ['Kết thúc', matchDateFormat.format(matchDate(room.end_time))],
    ['Địa điểm', room.location || room.court?.venue?.address],
    ['Sân', room.court?.name],
    ['Chủ phòng', room.host.profile?.full_name || room.host.email],
    ['Chi phí mỗi người', room.price_info && formatStoredCost(room.price_info)],
  ];

  return <details onToggle={(event) => setIsOpen(event.currentTarget.open)} className="group rounded-xl border border-white/10 bg-slate-900/60">
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-3 focus-visible:outline-2 focus-visible:outline-indigo-400 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-words font-bold">{room.title}</span>
          {room.removed && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-200">Phòng đã gỡ</span>}
        </span>
        <span className="mt-1 block text-xs text-slate-400">#{room.id} · {room.sport.name} · {startTime}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-300">
        <span className="group-open:hidden">Xem chi tiết</span>
        <span className="hidden group-open:inline">Thu gọn</span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 group-open:rotate-90" />
      </span>
    </summary>
    <div className="space-y-3 border-t border-white/10 px-3 py-3 text-sm">
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.filter(([, value]) => value).map(([label, value]) => <div key={label} className="min-w-0">
          <dt className="text-xs text-slate-400">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>)}
      </dl>
      {isOpen && <OccurredMatchAttendance roomId={room.id} />}
      {room.description && <p className="whitespace-pre-wrap break-words text-slate-300">{room.description}</p>}
    </div>
  </details>;
}

const attendanceBadges = {
  ATTENDED: ['Có mặt đã xác nhận', 'bg-emerald-500/15 text-emerald-300'],
  NO_SHOW: ['Vắng', 'bg-rose-500/15 text-rose-300'],
  UNVERIFIED: ['Chưa có kết quả', 'bg-slate-500/15 text-slate-300'],
};

function OccurredMatchAttendance({ roomId }) {
  const [results, setResults] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    adminService.getOccurredRoomAttendance(roomId, controller.signal).then(setResults).catch(() => {
      if (!controller.signal.aborted) setHasError(true);
    });
    return () => controller.abort();
  }, [roomId, attempt]);

  return <section className="border-t border-white/10 pt-3">
    <h3 className="mb-2 font-bold">Kết quả điểm danh</h3>
    {hasError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-rose-300">
      Không thể tải kết quả điểm danh.
      <button type="button" className="rounded-lg border border-white/15 px-2 py-1 text-slate-100" onClick={() => {
        setHasError(false);
        setAttempt((current) => current + 1);
      }}>Thử lại</button>
    </div> : !results ? <p role="status" className="text-slate-400">Đang tải kết quả điểm danh…</p> :
      <ul className="space-y-2">{results.map((result) => {
        const [label, badgeClass] = attendanceBadges[result.outcome] ?? attendanceBadges.UNVERIFIED;
        return <li key={result.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
          <span className="min-w-0 break-words">{result.name}{result.is_host && <span className="text-slate-400"> · Chủ phòng</span>}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{label}</span>
        </li>;
      })}</ul>}
  </section>;
}

function ContentList({ title, icon: Icon, items, getLabel, getMedia, onDelete }) {
  const [preview, setPreview] = useState(null);

  return <>
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="mb-3 flex items-center gap-2 font-black"><Icon className="h-4 w-4 text-indigo-300" /> {title} ({items.length})</h2>
      {items.length ? <div className="space-y-2">{items.map((item) => {
        const media = getMedia?.(item);
        const isVideo = media?.type === 'video' || media?.type?.startsWith('video/');
        return <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5">
          <div className="flex min-w-0 items-start gap-3">
            {media && <button type="button" onClick={() => setPreview(media)} className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950" aria-label={`Xem ${isVideo ? 'video' : 'ảnh'} của ${title}`}>
              {isVideo ? <video src={resolveMediaUrl(media.src)} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={resolveMediaUrl(media.src)} alt="" loading="lazy" className="h-full w-full object-cover" />}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-white opacity-0 transition group-hover:opacity-100">{isVideo ? <Play className="h-5 w-5 fill-current" /> : 'Xem'}</span>
            </button>}
            <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-5 text-slate-200">#{item.id} · {getLabel(item)}</p>
          </div>
          <button type="button" onClick={() => onDelete(item)} aria-label={`Xóa ${title}`} className="shrink-0 rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
        </div>;
      })}</div> : <Empty text={`Chưa có ${title.toLowerCase()}.`} />}
    </section>
    {preview && <MediaPreviewModal src={preview.src} type={preview.type} alt={preview.alt} onClose={() => setPreview(null)} />}
  </>;
}
