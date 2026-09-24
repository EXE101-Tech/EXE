import { useEffect, useState } from 'react';
import { Calendar, ImagePlus, MapPin, PlusCircle, X } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/services/api';
import { parseCostInputToVnd, storedCostToInput } from '../../../shared/utils/price';

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

const blankForm = () => ({ sport_id: 'badminton', title: '', description: '', location: '', date: todayLocal(), time_slot: '19:00 - 21:00', total_members: 4, price: '', skill_level: 'Intermediate', image_url: null });
const asDateInput = (dateLabel) => {
  if (!dateLabel) return todayLocal();
  const match = dateLabel.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : dateLabel.slice(0, 10);
};
const formFromPost = (post) => post ? {
  sport_id: post.sport_id,
  title: post.title,
  description: post.description || '',
  location: post.location,
  date: asDateInput(post.date_label || post.date),
  time_slot: post.time_slot || post.timeSlot,
  total_members: post.total_members || post.totalMembers,
  price: storedCostToInput(post.price),
  skill_level: post.skill_level || post.skillLevel,
  image_url: post.image_url || null,
} : blankForm();

export default function CreatePostModal({ isOpen, onClose, onCreate, initialPost = null }) {
  const [form, setForm] = useState(() => formFromPost(initialPost));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!imagePreview) return undefined;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  if (!isOpen) return null;
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const priceVnd = parseCostInputToVnd(form.price);
    if (priceVnd === null) {
      setError('Chi phí là bắt buộc. Nhập số nguyên theo nghìn đồng, ví dụ 50 hoặc 50.000; không nhập số thập phân.');
      return;
    }
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
        price: String(priceVnd / 1000),
        skill_level: form.skill_level,
        image_url: form.image_url,
        image_file: imageFile,
      });
      setForm(blankForm());
      setImageFile(null);
      setImagePreview('');
      setError('');
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
          <div><h2 id="lfg-title" className="text-lg font-black">{initialPost ? 'Chỉnh sửa bài đăng' : 'Đăng tìm người chơi'}</h2><p className="text-xs opacity-90">Bài đăng sẽ được lưu và hiển thị cho người chơi khác.</p></div>
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
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Chi phí / người (nghìn đồng) *<input required maxLength={20} inputMode="numeric" pattern="[0-9]+|[0-9]{1,3}([.][0-9]{3})+" value={form.price} onChange={update('price')} placeholder="50 hoặc 50.000" aria-describedby="lfg-price-hint" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /><span id="lfg-price-hint" className="mt-1 block font-normal text-slate-500">Nhập 50 = 50.000đ; có thể nhập 50.000. Không nhập số thập phân.</span></label>
            </div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Mô tả<textarea rows={3} maxLength={4000} value={form.description} onChange={update('description')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Ảnh bài đăng (tối đa 8 MB)</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-[#589470] dark:border-white/15 dark:text-slate-300">
                <ImagePlus className="h-4 w-4" />{imageFile ? imageFile.name : 'Chọn ảnh'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] || null; event.target.value = ''; setImageFile(file); setImagePreview(file ? URL.createObjectURL(file) : ''); }} />
              </label>
              {(imagePreview || form.image_url) && <div className="relative mt-3 h-36 overflow-hidden rounded-xl"><img src={imagePreview || resolveMediaUrl(form.image_url)} alt="Xem trước ảnh bài đăng" className="h-full w-full object-cover" /><button type="button" onClick={() => { setImageFile(null); setImagePreview(''); setForm((current) => ({ ...current, image_url: null })); }} className="absolute right-2 top-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-bold text-white">Gỡ ảnh</button></div>}
            </div>
            {!initialPost && <p className="text-xs text-slate-500">Tài khoản tạo bài được tính là thành viên đầu tiên.</p>}
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]"><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold dark:bg-white/10">Hủy</button><button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#74C365] to-[#589470] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"><PlusCircle className="h-4 w-4" />{isSaving ? 'Đang lưu…' : initialPost ? 'Lưu thay đổi' : 'Đăng bài'}</button></footer>
        </form>
      </section>
    </div>
  );
}
