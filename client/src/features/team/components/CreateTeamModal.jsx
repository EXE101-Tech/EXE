import { useEffect, useState } from 'react';
import { Crown, MapPin, Users, X } from 'lucide-react';
import { sportService } from '../../../shared/services/api';

const SPORT_EMOJI = { badminton: '🏸', football: '⚽', pickleball: '🏓', tennis: '🎾', basketball: '🏀', volleyball: '🏐' };

export default function CreateTeamModal({ isOpen, onClose, onSubmit, initialTeam = null }) {
  const [sports, setSports] = useState([]);
  const [form, setForm] = useState({ name: '', sport_id: 'badminton', location: '', total_slots: 20, description: '', tags: '' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    sportService.getAll().then((items) => setSports(items.filter((item) => item.id != null)))
      .catch((err) => setError(err.message || 'Không tải được danh sách môn thể thao'));
    setForm(initialTeam ? {
      name: initialTeam.name || '',
      sport_id: initialTeam.sport_id || 'badminton',
      location: initialTeam.location || '',
      total_slots: initialTeam.total_slots || 20,
      description: initialTeam.description || '',
      tags: (initialTeam.tags || []).join(', '),
    } : { name: '', sport_id: 'badminton', location: '', total_slots: 20, description: '', tags: '' });
    setError('');
  }, [isOpen, initialTeam]);

  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    const sport = sports.find((item) => item.key === form.sport_id);
    if (!sport) {
      setError('Môn thể thao chưa sẵn sàng. Vui lòng tải lại danh sách.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onSubmit({
        name: form.name.trim(),
        sport_id: sport.key,
        sport_name: sport.name,
        location: form.location.trim(),
        total_slots: Number(form.total_slots),
        description: form.description.trim() || null,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
    } catch (err) {
      setError(err.message || 'Không lưu được thông tin CLB');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="my-6 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#001F3F]" role="dialog" aria-modal="true" aria-labelledby="team-form-title">
        <header className="flex items-center justify-between bg-gradient-to-r from-[#74C365] to-[#589470] p-5 text-white">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-white/20 p-3"><Crown className="h-5 w-5" /></span><div><h2 id="team-form-title" className="text-lg font-black">{initialTeam ? 'Chỉnh sửa CLB' : 'Thành lập CLB'}</h2><p className="text-xs opacity-90">Thông tin được lưu vào hệ thống</p></div></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full bg-black/10 p-2 hover:bg-black/20"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto p-5 sm:p-7">
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Môn thể thao chính</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {sports.map((sport) => <button key={sport.key} type="button" onClick={() => setForm((current) => ({ ...current, sport_id: sport.key }))} className={`rounded-xl border p-2 text-center text-xs font-semibold ${form.sport_id === sport.key ? 'border-[#589470] bg-[#589470]/10 text-[#589470]' : 'border-slate-200 dark:border-white/10'}`}><span className="mb-1 block text-xl">{SPORT_EMOJI[sport.key] || '🏅'}</span>{sport.name}</button>)}
              </div>
            </fieldset>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Tên CLB *<input required minLength={2} maxLength={160} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="VD: CLB Cầu lông Proton" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Khu vực hoạt động *</span><input required minLength={2} maxLength={255} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Quận / thành phố" /></label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300"><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Số thành viên tối đa</span><input required type="number" min="2" max="500" value={form.total_slots} onChange={(event) => setForm((current) => ({ ...current, total_slots: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            </div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Mô tả và nội quy<textarea rows={4} maxLength={5000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Lịch tập, trình độ, nội quy…" /></label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Thẻ phân loại (ngăn cách bằng dấu phẩy)<input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Mọi trình độ, giao lưu" /></label>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-white">Hủy</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-gradient-to-r from-[#74C365] to-[#589470] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{isSaving ? 'Đang lưu…' : initialTeam ? 'Lưu thay đổi' : 'Tạo CLB'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
