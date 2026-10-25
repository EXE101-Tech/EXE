import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, Clock3, Crown, Flag, MapPin, MessageCircle, Trophy, UserCheck, UserPlus, Users, X } from 'lucide-react';
import ReputationPanel from '../../features/profile/ReputationPanel';
import { chatService, resolveMediaUrl, userProfileService } from '../services/api';
import { useChat } from '../context/ChatContext';
import { isActiveSport } from '../constants/sports';
import heroBgImg from '../../assets/sports/badminton.avif';

const LEVELS = { Beginner: 'Mới chơi', Intermediate: 'Trung bình', Advanced: 'Khá', Expert: 'Chuyên nghiệp' };
const LEVEL_RANK = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
const SPORTS = {
  badminton: ['🏸', 'Cầu lông'], 'cầu lông': ['🏸', 'Cầu lông'],
  football: ['⚽', 'Bóng đá'], 'bóng đá': ['⚽', 'Bóng đá'],
  pickleball: ['🏓', 'Pickleball'],
};

// Merge duplicate sport rows (e.g. "Badminton" and "Cầu lông") and keep the highest level.
const groupSports = (items = []) => {
  const bySport = new Map();
  for (const item of items.filter((entry) => isActiveSport(entry.sport_name))) {
    const [emoji, name] = SPORTS[(item.sport_name || '').trim().toLowerCase()] || ['🏅', item.sport_name || 'Môn thể thao'];
    const previous = bySport.get(name);
    const higher = (LEVEL_RANK[item.skill_level] || 0) >= (LEVEL_RANK[previous?.level] || 0);
    bySport.set(name, { name, emoji, level: higher ? item.skill_level : previous.level, games: (previous?.games || 0) + (item.games_played || 0) });
  }
  return [...bySport.values()];
};

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendError, setFriendError] = useState('');
  const dialog = useRef(null);
  const { openChat } = useChat();

  useEffect(() => {
    let active = true;
    userProfileService.get(userId).then((data) => active && setProfile(data)).catch((failure) => active && setError(failure.message || 'Không tải được hồ sơ'));
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); previous?.focus?.(); };
  }, [onClose]);

  const updateFriendship = async () => {
    const { id, status } = profile.friendship;
    setFriendBusy(true); setFriendError('');
    try {
      if (status === 'incoming') await chatService.acceptFriendRequest(id);
      else await chatService.sendFriendRequest(profile.id);
      setProfile(await userProfileService.get(profile.id));
    } catch (failure) {
      setFriendError(failure.message || 'Không cập nhật được lời mời kết bạn.');
    } finally {
      setFriendBusy(false);
    }
  };
  const message = () => { onClose(); openChat({ id: profile.id, name: profile.name, avatar_url: resolveMediaUrl(profile.avatar_url) }); };
  const friendStatus = profile?.friendship?.status;

  const avatar = resolveMediaUrl(profile?.avatar_url);
  const sports = groupSports(profile?.sports);
  const stats = [
    { label: 'Trận đã chơi', value: profile?.games_played ?? 0, icon: Trophy, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Buổi đã tổ chức', value: profile?.hosted_games ?? 0, icon: Flag, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'CLB tham gia', value: profile?.teams_joined ?? 0, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  ];

  // Portaled outside the layout, so re-enter the .sg-app scope to inherit theme variables.
  return createPortal(<div className="sg-app" style={{ minHeight: 0, background: 'none' }}><div className="sg-modal-backdrop fixed inset-0 z-[1300] flex items-center justify-center p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={profile ? `Hồ sơ của ${profile.name}` : 'Hồ sơ người chơi'} className="sg-modal-card sg-user-profile-modal relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl outline-none">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-black/45 p-2 text-white hover:bg-black/60 transition-colors" aria-label="Đóng hồ sơ"><X className="h-5 w-5" /></button>
      {error && <p role="alert" className="m-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {!profile && !error && <p role="status" className="p-10 text-center text-sm text-slate-500">Đang tải hồ sơ…</p>}
      {profile && <>
        <div className="relative h-32 sm:h-40 overflow-hidden">
          <img src={resolveMediaUrl(profile.cover_url) || heroBgImg} alt="" className="h-full w-full object-cover object-[50%_42%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/35 to-[#5e87f7]/35" />
        </div>
        <div className="px-5 sm:px-7 pb-5">
          <div className="relative z-10 -mt-10 flex items-end gap-4">
            <div className={`h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-full p-1.5 shadow-xl bg-gradient-to-tr from-[#5e87f7] to-[#83a6ff] ${profile.is_premium ? 'sg-premium-avatar-shell' : ''}`}>
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white dark:bg-[#001F3F] text-3xl font-black text-[#5e87f7] dark:text-[#83a6ff]">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : profile.name.charAt(0).toUpperCase()}</div>
            </div>
            <div className="min-w-0 pb-1">
              <h2 className={`flex flex-wrap items-center gap-2 text-xl sm:text-2xl font-black leading-tight break-words ${profile.is_premium ? 'sg-premium-name' : ''}`}>{profile.name}{profile.is_premium && <Crown className="h-4 w-4 text-amber-500" aria-label="Premium" />}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {profile.district && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.district}</span>}
                {profile.member_since && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Tham gia từ {new Date(profile.member_since).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</span>}
              </div>
            </div>
          </div>
          {profile.bio && <p className="sg-profile-bio">{profile.bio}</p>}

          {!profile.is_self && <div className="mt-4 flex flex-wrap items-center gap-2">
            {friendStatus === 'friends' && <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400"><UserCheck className="h-4 w-4" />Bạn bè</span>}
            {friendStatus === 'outgoing' && <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-500/10 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-300"><Clock3 className="h-4 w-4" />Đã gửi lời mời kết bạn</span>}
            {(friendStatus === 'none' || friendStatus === 'incoming') && <button type="button" disabled={friendBusy} onClick={updateFriendship} className="sg-modal-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60">
              {friendStatus === 'incoming' ? <><Check className="h-4 w-4" />Chấp nhận kết bạn</> : <><UserPlus className="h-4 w-4" />Kết bạn</>}
            </button>}
            <button type="button" onClick={message} className="sg-modal-secondary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"><MessageCircle className="h-4 w-4" />Nhắn tin</button>
            {friendStatus === 'incoming' && <span className="text-xs text-slate-500 dark:text-slate-400">Người này đã gửi lời mời kết bạn cho bạn.</span>}
          </div>}
          {friendError && <p role="alert" className="mt-2 text-xs font-semibold text-red-500">{friendError}</p>}

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-900/30 p-3">
              <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg ${color}`}><Icon className="h-3.5 w-3.5" /></div>
              <p className="text-lg sm:text-xl font-black">{value}</p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            </div>)}
          </div>

          <div className="mt-5 border-t border-slate-200/70 dark:border-slate-700/70 pt-5"><ReputationPanel userId={profile.id} summary={profile.reputation} own={false} embedded /></div>

          <div className="mt-5 border-t border-slate-200/70 dark:border-slate-700/70 pt-5">
            <h3 className="mb-3 text-base font-bold">Trình độ các môn</h3>
            {sports.length ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{sports.map((sport) => <div key={sport.name} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3">
              <span className="text-2xl" aria-hidden="true">{sport.emoji}</span>
              <div className="min-w-0 flex-1"><p className="font-bold">{sport.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{sport.games} trận</p></div>
              <span className="whitespace-nowrap rounded-lg bg-slate-100 dark:bg-slate-700/70 px-2 py-1 text-[11px] font-bold">{LEVELS[sport.level] || sport.level || 'Chưa biết'}</span>
            </div>)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm text-slate-500">Người chơi chưa cập nhật trình độ.</p>}
          </div>
        </div>
      </>}
    </section>
  </div></div>, document.body);
}
