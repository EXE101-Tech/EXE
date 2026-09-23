import { useState } from 'react';
import { Calendar, MapPin, PlusCircle, X } from 'lucide-react';

const SPORTS = [
  { id: 'badminton', name: 'Cầu lông', emoji: '🏸' },
  { id: 'football', name: 'Bóng đá', emoji: '⚽' },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'basketball', name: 'Bóng rổ', emoji: '🏀' },
  { id: 'volleyball', name: 'Bóng chuyền', emoji: '🏐' },
];
const todayLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

export default function CreatePostModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState({ sport_id: 'badminton', title: '', description: '', location: '', date: todayLocal(), time_slot: '19:00 - 21:00', total_members: 4, price: '', skill_level: 'Intermediate' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const sport = SPORTS.find((item) => item.id === form.sport_id);
    const dateLabel = new Date(`${form.date}T12:00:00`).toLocaleDateString('vi-VN');
    setIsSaving(true);
    setError('');
    try {
      await onCreate({
        sport_id: sport.id,
        sport_name: sport.name,
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim(),
        time_slot: form.time_slot.trim(),
        date_label: dateLabel,
        current_members: 1,
        total_members: Number(form.total_members),
        price: form.price.trim() || null,
        skill_level: form.skill_level,
      });
      setForm({ sport_id: 'badminton', title: '', description: '', location: '', date: todayLocal(), time_slot: '19:00 - 21:00', total_members: 4, price: '', skill_level: 'Intermediate' });
      onClose();
    } catch (err) {
      setError(err.message || 'Không đăng được bài tìm người chơi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="my-6 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#001F3F]" role="dialog" aria-modal="true" aria-labelledby="lfg-title">
        <header className="flex items-center justify-between bg-gradient-to-r from-[#74C365] to-[#589470] p-5 text-white">
          <div><h2 id="lfg-title" className="text-lg font-black">Đăng tìm người chơi</h2><p className="text-xs opacity-90">Bài đăng sẽ được lưu và hiển thị cho người chơi khác.</p></div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full bg-black/10 p-2"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto p-5 sm:p-7">
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            <fieldset><legend className="mb-2 text-xs font-bold uppercase text-slate-500">Môn thể thao *</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{SPORTS.map((sport) => <button key={sport.id} type="button" onClick={() => setForm((current) => ({ ...current, sport_id: sport.id }))} className={`rounded-xl border p-2 text-center text-xs font-bold ${form.sport_id === sport.id ? 'border-[#589470] bg-[#589470]/10 text-[#589470]' : 'border-slate-200 dark:border-white/10'}`}><span className="mb-1 block text-xl">{sport.emoji}</span>{sport.name}</button>)}</div></fieldset>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Tiêu đề *<input required minLength={3} maxLength={200} value={form.title} onChange={update('title')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Địa điểm *</span><input required minLength={2} maxLength={255} value={form.location} onChange={update('location')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Ngày chơi *</span><input required type="date" min={todayLocal()} value={form.date} onChange={update('date')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Khung giờ *<input required maxLength={100} value={form.time_slot} onChange={update('time_slot')} placeholder="19:00 - 21:00" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Tổng số người<input required type="number" min="2" max="500" value={form.total_members} onChange={update('total_members')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Trình độ<select value={form.skill_level} onChange={update('skill_level')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"><option value="Beginner">Mới chơi</option><option value="Intermediate">Trung bình</option><option value="Advanced">Khá / Giỏi</option><option value="Expert">Chuyên nghiệp</option></select></label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Chi phí<input maxLength={120} value={form.price} onChange={update('price')} placeholder="50.000đ / người" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            </div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Mô tả<textarea rows={3} maxLength={4000} value={form.description} onChange={update('description')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            <p className="text-xs text-slate-500">Tài khoản tạo bài được tính là thành viên đầu tiên. Ảnh chỉ bật lại khi dự án có dịch vụ lưu trữ ảnh bền vững.</p>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]"><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold dark:bg-white/10">Hủy</button><button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#74C365] to-[#589470] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"><PlusCircle className="h-4 w-4" />{isSaving ? 'Đang đăng…' : 'Đăng bài'}</button></footer>
        </form>
      </section>
    </div>
  );
}
