import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../shared/services/api';
import { useAuth } from '../../shared/context/AuthContext';

export default function AccountDeletionPage() {
  const { user, deleteAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const deleteFromAccount = async () => {
    if (!window.confirm('Xoá tài khoản và dữ liệu liên quan ngay bây giờ? Hành động này không thể hoàn tác.')) return;
    setError('');
    try {
      await deleteAccount();
      setDeleted(true);
    } catch (requestError) {
      setError(requestError.message || 'Không thể xoá tài khoản.');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const result = await authService.requestDeletion({ email, reason: reason.trim() || null });
      setMessage(result.message || 'Yêu cầu đã được ghi nhận.');
      setEmail('');
      setReason('');
    } catch (requestError) {
      setError(requestError.message || 'Không gửi được yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-12 text-slate-800 dark:text-slate-100 sm:px-8">
    <Link to="/privacy-policy" className="text-sm font-bold text-brand-primary hover:underline">← Chính sách quyền riêng tư</Link>
    <p className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-brand-primary">SPORTGO · ACCOUNT DELETION</p>
    <h1 className="mt-3 text-4xl font-black tracking-tight">Xoá tài khoản SportGo</h1>
    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Bạn có thể xoá trực tiếp trong mục Hồ sơ của ứng dụng. Nếu không thể truy cập ứng dụng, hãy gửi biểu mẫu dưới đây. SportGo sẽ xác minh yêu cầu và xử lý dữ liệu liên quan đến tài khoản.</p>
    {user && !deleted && <section className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-400/20 dark:bg-rose-400/10"><h2 className="font-black text-rose-800 dark:text-rose-200">Bạn đang đăng nhập</h2><p className="mt-1 text-sm text-rose-700 dark:text-rose-300">Xoá trực tiếp tài khoản {user.email} và dữ liệu gắn với tài khoản.</p><button type="button" onClick={deleteFromAccount} className="mt-4 rounded-xl border border-rose-400/60 px-4 py-2.5 text-sm font-bold text-rose-700 dark:text-rose-200">Xoá tài khoản ngay</button></section>}
    {deleted && <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">Tài khoản đã được xoá.</p>}
    <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg dark:border-white/10 dark:bg-[#101827]">
      <label className="block text-sm font-bold">Email tài khoản<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@gmail.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-brand-primary dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
      <label className="block text-sm font-bold">Lý do (không bắt buộc)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-brand-primary dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{message}</p>}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? 'Đang gửi…' : 'Gửi yêu cầu xoá tài khoản'}</button>
    </form>
  </main>;
}
