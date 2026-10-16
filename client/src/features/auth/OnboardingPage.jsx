import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MapPin, Trophy, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ACTIVITY_DISTRICTS } from '../../shared/constants/districts';
import brandLogo from '../../../icons/logo.png';

const ONBOARDING_KEY = 'sportgo-onboarding-pending';

const SPORTS = [
  { key: 'badminton', name: 'Cầu lông', emoji: '🏸', description: 'Nhanh, vui và dễ tìm bạn chơi' },
  { key: 'pickleball', name: 'Pickleball', emoji: '🏓', description: 'Môn thể thao đang phát triển' },
  { key: 'football', name: 'Bóng đá', emoji: '⚽', description: 'Kết nối đội hình cùng khu vực' },
];

const LEVELS = [
  { value: 'Beginner', label: 'Mới chơi', description: 'Chơi vui, đang làm quen' },
  { value: 'Intermediate', label: 'Trung bình', description: 'Đã chơi thường xuyên' },
  { value: 'Advanced', label: 'Khá', description: 'Tự tin trong các trận đấu' },
  { value: 'Expert', label: 'Nâng cao', description: 'Kinh nghiệm và kỹ thuật tốt' },
];

function Logo() {
  return <div className="flex items-center gap-2 text-white"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200/35 bg-gradient-to-br from-indigo-300/20 to-cyan-300/10 shadow-[0_0_28px_rgba(99,141,255,.28)]"><img src={brandLogo} alt="SportGo" className="h-7 w-7 object-contain drop-shadow-[0_0_9px_rgba(103,232,249,.45)]" /></span><span className="text-lg font-black tracking-tight">SPORT<span className="text-indigo-300">GO</span></span></div>;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [stepDirection, setStepDirection] = useState('forward');
  const [selectedSports, setSelectedSports] = useState([]);
  const [skills, setSkills] = useState({});
  const [district, setDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pendingId = localStorage.getItem(ONBOARDING_KEY);
    if (!user || pendingId !== String(user.id)) navigate('/home', { replace: true });
  }, [navigate, user]);

  const selectedSportDetails = useMemo(
    () => SPORTS.filter((sport) => selectedSports.includes(sport.key)),
    [selectedSports],
  );

  const toggleSport = (sportKey) => {
    if (selectedSports.includes(sportKey)) {
      setSelectedSports((current) => current.filter((key) => key !== sportKey));
      setSkills((levels) => {
        const next = { ...levels };
        delete next[sportKey];
        return next;
      });
      return;
    }
    if (selectedSports.length < 3) setSelectedSports((current) => [...current, sportKey]);
  };

  const canContinue = step === 1
    ? selectedSports.length > 0
    : step === 2
      ? selectedSports.every((sport) => skills[sport])
      : step === 3 ? Boolean(district) : true;

  const goToStep = (nextStep, direction = 'forward') => {
    if (nextStep === step) return;
    setStepDirection(direction);
    setStep(nextStep);
  };

  const nextStep = () => {
    setError('');
    if (!canContinue) return;
    goToStep(Math.min(3, step + 1));
  };

  const saveOnboarding = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        district,
        sports: Object.fromEntries(selectedSports.map((sport) => [sport, skills[sport]])),
      });
      goToStep(4);
    } catch (saveError) {
      setError(saveError.message || 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const startExploring = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    navigate('/home', { replace: true });
  };

  if (!user || localStorage.getItem(ONBOARDING_KEY) !== String(user.id)) return null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d1b] px-4 py-6 text-white sm:px-8">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col">
        <header className="flex items-center justify-between">
          <Logo />
          {step > 0 && step < 4 && <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300">Bước {step}/3</span>}
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <section key={step} style={{ '--onboarding-enter-x': stepDirection === 'forward' ? '10px' : '-10px' }} className="onboarding-step-enter flex min-h-[34rem] w-full max-w-3xl flex-col justify-center">
            {step === 0 && <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-200/35 bg-gradient-to-br from-indigo-400/25 to-cyan-300/10 shadow-[0_0_55px_rgba(99,141,255,.28)]"><img src={brandLogo} alt="SportGo" className="h-14 w-14 object-contain drop-shadow-[0_0_16px_rgba(103,232,249,.55)]" /></div>
              <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-cyan-300">Xin chào, {user.name || user.profile?.full_name || 'bạn'}!</p>
              <h1 className="text-4xl font-black leading-tight sm:text-6xl">Chào mừng bạn đến với<br /><span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">thế giới thể thao</span></h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Hãy cho SportGo biết một chút về bạn để tìm những trận chơi phù hợp và kết nối với cộng đồng gần bạn.</p>
              <button type="button" onClick={() => goToStep(1)} className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3.5 text-sm font-black shadow-[0_12px_35px_rgba(59,130,246,.28)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(59,130,246,.4)]">Bắt đầu thiết lập <ArrowRight className="h-4 w-4" /></button>
            </div>}

            {step === 1 && <div>
              <div className="mb-8 text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-400/15 text-indigo-200"><Trophy className="h-7 w-7" /></span><h1 className="text-3xl font-black sm:text-4xl">Bạn thường chơi môn nào?</h1><p className="mt-2 text-slate-400">Chọn từ 1 đến 3 môn để SportGo gợi ý đúng hơn.</p></div>
              <div className="grid gap-4 md:grid-cols-3">{SPORTS.map((sport) => { const selected = selectedSports.includes(sport.key); return <button key={sport.key} type="button" aria-pressed={selected} onClick={() => toggleSport(sport.key)} className={`group relative overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300 ease-out hover:-translate-y-1 ${selected ? 'border-cyan-300 bg-cyan-300/15 shadow-[0_0_30px_rgba(103,232,249,.15)]' : 'border-white/10 bg-white/[0.04] hover:border-indigo-300/50 hover:bg-white/[0.08]'}`}><span className="text-4xl">{sport.emoji}</span><span className="mt-4 block text-lg font-black">{sport.name}</span><span className="mt-1 block text-sm leading-6 text-slate-400">{sport.description}</span><span className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300 text-slate-950 transition-all duration-300 ease-out ${selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}><Check className={`h-4 w-4 transition-transform duration-300 delay-100 ${selected ? 'scale-100' : 'scale-0'}`} /></span></button>; })}</div>
              <div className="mt-8 flex justify-end"><button type="button" disabled={!canContinue} onClick={nextStep} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-black transition-all duration-300 hover:bg-indigo-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40">Tiếp tục <ArrowRight className="h-4 w-4" /></button></div>
            </div>}

            {step === 2 && <div>
              <div className="mb-8 text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200"><UserRound className="h-7 w-7" /></span><h1 className="text-3xl font-black sm:text-4xl">Trình độ của bạn thế nào?</h1><p className="mt-2 text-slate-400">Chọn trình độ cho từng môn bạn đã chọn.</p></div>
              <div className="space-y-5">{selectedSportDetails.map((sport) => <div key={sport.key} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="mb-4 flex items-center gap-3"><span className="text-3xl">{sport.emoji}</span><div><h2 className="font-black">{sport.name}</h2><p className="text-xs text-slate-400">Bạn tự đánh giá ở mức nào?</p></div></div><div className="grid gap-2 sm:grid-cols-4">{LEVELS.map((level) => { const selected = skills[sport.key] === level.value; return <button key={level.value} type="button" aria-pressed={selected} onClick={() => setSkills((current) => ({ ...current, [sport.key]: level.value }))} className={`relative overflow-hidden rounded-2xl border px-3 py-3 text-left transition-all duration-300 ease-out ${selected ? 'border-indigo-300 bg-indigo-400/20 text-white shadow-[0_0_20px_rgba(129,140,248,.15)]' : 'border-white/10 bg-slate-950/30 text-slate-300 hover:border-indigo-300/50 hover:bg-slate-900/50'}`}><span className="block text-sm font-black">{level.label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-400">{level.description}</span></button>; })}</div></div>)}</div>
              <div className="mt-8 flex items-center justify-between"><button type="button" onClick={() => goToStep(1, 'backward')} className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition-colors duration-300 hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> Quay lại</button><button type="button" disabled={!canContinue} onClick={nextStep} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-black transition duration-300 ease-out hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">Tiếp tục <ArrowRight className="h-4 w-4" /></button></div>
            </div>}

            {step === 3 && <div className="mx-auto max-w-xl text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200"><MapPin className="h-7 w-7" /></span><h1 className="text-3xl font-black sm:text-4xl">Bạn thường hoạt động ở đâu?</h1><p className="mt-2 text-slate-400">Chọn quận để SportGo tìm người chơi và lời mời gần bạn.</p><label className="mt-8 block text-left text-sm font-bold text-slate-200">Khu vực hoạt động</label><select value={district} onChange={(event) => setDistrict(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-cyan-300" autoFocus><option value="">Chọn quận/khu vực</option>{ACTIVITY_DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}</select><p className="mt-3 text-left text-xs text-slate-500">Bạn có thể chỉnh sửa khu vực này sau trong mục Thông tin cá nhân.</p><div className="mt-8 flex items-center justify-between"><button type="button" onClick={() => goToStep(2, 'backward')} className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition-colors duration-300 hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> Quay lại</button><button type="button" disabled={!canContinue || saving} onClick={saveOnboarding} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 text-sm font-black transition duration-300 ease-out hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Đang lưu...' : 'Hoàn tất thiết lập'} <Check className="h-4 w-4" /></button></div></div>}

            {step === 4 && <div className="mx-auto max-w-2xl text-center"><div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 text-slate-950 shadow-[0_0_55px_rgba(52,211,153,.3)]"><Check className="h-12 w-12" /></div><p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Hồ sơ đã sẵn sàng</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">Cùng SportGo bắt đầu nhé!</h1><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300">Bạn có thể chỉnh sửa các môn chơi, trình độ và khu vực hoạt động bất cứ lúc nào trong mục Thông tin cá nhân (Profile).</p><button type="button" onClick={startExploring} className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_12px_35px_rgba(52,211,153,.25)] transition hover:-translate-y-0.5">Bắt đầu khám phá <ArrowRight className="h-4 w-4" /></button></div>}

            {error && <p role="alert" className="mx-auto mt-6 max-w-xl rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-center text-sm text-rose-200">{error}</p>}
          </section>
        </div>
        {step > 0 && step < 4 && <div className="mx-auto h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-400 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} /></div>}
        <p className="mt-5 text-center text-xs text-slate-500">SportGo · Chơi cùng nhau, tiến xa hơn.</p>
      </div>
    </main>
  );
}

export default OnboardingPage;
