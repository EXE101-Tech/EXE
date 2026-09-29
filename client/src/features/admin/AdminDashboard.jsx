import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, FileText, Gamepad2, LogOut, Shield, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { adminService, gameRoomService, resolveMediaUrl, socialPostService, teamService } from '../../shared/services/api';

const tabs = [
  { id: 'payments', label: 'Giao dịch', icon: ClipboardList },
  { id: 'content', label: 'Kiểm duyệt nội dung', icon: Shield },
  { id: 'accounts', label: 'Tài khoản admin', icon: Users },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('payments');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '' });
  const [warningForm, setWarningForm] = useState({ target_type: 'team', target_id: '', message: '' });

  const load = async () => {
    setLoading(true);
    const [summaryResult, paymentsResult, accountsResult, postsResult, roomsResult, teamsResult] = await Promise.allSettled([
      adminService.getSummary(),
      adminService.getPayments('PENDING'),
      adminService.getAccounts(),
      adminService.getPosts(),
      adminService.getRooms(),
      teamService.getAll(),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    if (paymentsResult.status === 'fulfilled') setPayments(paymentsResult.value);
    if (accountsResult.status === 'fulfilled') setAccounts(accountsResult.value);
    if (postsResult.status === 'fulfilled') setPosts(postsResult.value);
    if (roomsResult.status === 'fulfilled') setRooms(roomsResult.value);
    if (teamsResult.status === 'fulfilled') setTeams(teamsResult.value);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (payment, status) => {
    try {
      await adminService.reviewPayment(payment.id, { status });
      setPayments((current) => current.filter((item) => item.id !== payment.id));
      setSummary((current) => current ? { ...current, pending_payments: Math.max(0, current.pending_payments - 1) } : current);
      setMessage(status === 'APPROVED' ? 'Đã duyệt và kích hoạt Premium.' : 'Đã từ chối giao dịch.');
    } catch (error) { setMessage(error.message || 'Không thể cập nhật giao dịch.'); }
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

  const sendWarning = async (event) => {
    event.preventDefault();
    try {
      await adminService.sendWarning({ ...warningForm, target_id: Number(warningForm.target_id) });
      setWarningForm((current) => ({ ...current, target_id: '', message: '' }));
      setMessage('Đã gửi cảnh cáo.');
    } catch (error) { setMessage(error.message || 'Không thể gửi cảnh cáo.'); }
  };

  return <main className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-[1500px] items-center justify-between border-b border-white/10 pb-5">
      <div><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-500/20 p-2 text-indigo-300"><Shield className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">SportGo Admin</p><h1 className="text-2xl font-black">Trung tâm kiểm duyệt</h1></div></div><p className="mt-2 text-sm text-slate-400">Đăng nhập: {user?.email}</p></div>
      <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"><LogOut className="h-4 w-4" /> Đăng xuất</button>
    </header>
    <section className="mx-auto mt-6 grid max-w-[1500px] grid-cols-2 gap-3 md:grid-cols-5">{[['Người dùng', summary?.users], ['Bài viết', summary?.posts], ['CLB', summary?.teams], ['Phòng', summary?.rooms], ['Chờ duyệt', summary?.pending_payments]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value ?? '—'}</p></div>)}</section>
    <nav className="mx-auto mt-6 flex max-w-[1500px] gap-2 overflow-x-auto border-b border-white/10 pb-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/10'}`}><Icon className="h-4 w-4" /> {label}</button>)}</nav>
    {message && <div role="status" className="mx-auto mt-4 max-w-[1500px] rounded-xl bg-indigo-500/15 px-4 py-3 text-sm text-indigo-200">{message}</div>}
    {loading ? <div className="mx-auto mt-8 max-w-[1500px] text-slate-400">Đang tải dữ liệu quản trị...</div> : <section className="mx-auto mt-6 grid max-w-[1500px] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-3">
        {tab === 'payments' && <>{payments.length === 0 ? <Empty text="Chưa có giao dịch chờ duyệt." /> : payments.map((payment) => <article key={payment.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{payment.user_name} <span className="font-normal text-slate-400">({payment.user_email})</span></p><p className="mt-1 font-mono text-sm text-indigo-300">{payment.payment_code}</p><p className="mt-1 text-xs text-slate-400">{new Date(payment.submitted_at).toLocaleString('vi-VN')} · {payment.amount.toLocaleString('vi-VN')}đ</p></div><div className="flex gap-2"><button type="button" onClick={() => review(payment, 'REJECTED')} className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-300">Từ chối</button><button type="button" onClick={() => review(payment, 'APPROVED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Duyệt và kích hoạt</button></div></div>{payment.proof_url && <a href={resolveMediaUrl(payment.proof_url)} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-xl border border-white/10"><img src={resolveMediaUrl(payment.proof_url)} alt="Ảnh chuyển khoản" className="max-h-80 w-full object-contain" /></a>}</article>)}</>}
        {tab === 'content' && <><ContentList title="Bài viết" icon={FileText} items={posts} getLabel={(item) => `${item.author_name}: ${item.content || 'Bài có ảnh/video'}`} onDelete={(item) => remove('post', item.id)} /><ContentList title="Phòng chơi" icon={Gamepad2} items={rooms} getLabel={(item) => `${item.title} · ${item.host?.profile?.full_name || item.host?.email || 'Chủ phòng'}`} onDelete={(item) => remove('room', item.id)} /><ContentList title="CLB" icon={Users} items={teams} getLabel={(item) => `${item.name} · ${item.owner_name || 'Chủ CLB'}`} onDelete={(item) => remove('team', item.id)} /></>}
        {tab === 'accounts' && <>{accounts.map((account) => <div key={account.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div><p className="font-bold">{account.profile?.full_name || account.email}</p><p className="text-xs text-slate-400">{account.email}</p></div><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">Admin</span></div>)}</>}
      </div>
      <aside className="space-y-4">
        {tab === 'accounts' && <form onSubmit={createAccount} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="font-black">Cấp tài khoản admin</h2><div className="mt-3 space-y-2">{[['name', 'Họ tên'], ['email', 'Email'], ['password', 'Mật khẩu']].map(([field, label]) => <input key={field} required type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} placeholder={label} value={accountForm[field]} onChange={(event) => setAccountForm((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />)}</div><button type="submit" className="mt-3 w-full rounded-xl bg-indigo-500 px-3 py-2.5 text-sm font-bold">Cấp tài khoản</button></form>}
        {tab === 'content' && <form onSubmit={sendWarning} className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4"><h2 className="flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4 text-amber-300" /> Gửi cảnh cáo</h2><select value={warningForm.target_type} onChange={(event) => setWarningForm((current) => ({ ...current, target_type: event.target.value }))} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"><option value="team">CLB</option><option value="game_room">Phòng chơi</option></select><input required type="number" min="1" placeholder="ID mục tiêu" value={warningForm.target_id} onChange={(event) => setWarningForm((current) => ({ ...current, target_id: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" /><textarea required rows="4" placeholder="Nội dung cảnh cáo" value={warningForm.message} onChange={(event) => setWarningForm((current) => ({ ...current, message: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" /><button type="submit" className="mt-2 w-full rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-bold text-slate-950">Gửi cảnh cáo</button></form>}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400"><p className="font-bold text-slate-200">Quyền của admin</p><p className="mt-2">Tài khoản quản trị chỉ xem và kiểm duyệt. Like, bình luận, tạo bài, tạo phòng, tạo CLB và tham gia nội dung bị chặn ở backend.</p></div>
      </aside>
    </section>}
  </main>;
}

function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">{text}</div>; }

function ContentList({ title, icon: Icon, items, getLabel, onDelete }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="mb-3 flex items-center gap-2 font-black"><Icon className="h-4 w-4 text-indigo-300" /> {title} ({items.length})</h2>{items.length ? <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5"><p className="min-w-0 truncate text-sm text-slate-200">#{item.id} · {getLabel(item)}</p><button type="button" onClick={() => onDelete(item)} aria-label={`Xóa ${title}`} className="shrink-0 rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div>)}</div> : <Empty text={`Chưa có ${title.toLowerCase()}.`} />}</section>;
}
