import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Menu, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import brandLogo from '../../../icons/logo.png';
import StoryCanvas from './components/StoryCanvas';
import { SportSticker } from '../../shared/components/SportReactions';

function LandingPage() {
  const { t } = useTranslation();
  const [showNavCta, setShowNavCta] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const storyRef = useRef(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const chapters = t('landing.story.chapters', { returnObjects: true });
  const handleChapterChange = useCallback((index) => setActiveChapter(index), []);

  // Scroll so the chapter's first beat is centred (see StoryCanvas for the beat model).
  const scrollToChapter = (index) => {
    const section = storyRef.current?.querySelectorAll('[data-chapter]')[index];
    if (!section) return;
    const beatHeight = section.offsetHeight / (Number(section.dataset.span) || 1);
    const top = section.getBoundingClientRect().top + window.scrollY + beatHeight / 2 - window.innerHeight / 2;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const handleNavigate = (path) => (e) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      navigate(path);
    }, 400); // 400ms is slightly less than 500ms transition to ensure it fires smoothly
  };

  useEffect(() => {
    const handleScroll = () => {
      const heroCta = document.getElementById('hero-cta');
      if (heroCta) {
        const rect = heroCta.getBoundingClientRect();
        // Show nav CTA when the bottom of hero CTA scrolls above the taskbar (around 80px from top)
        setShowNavCta(rect.bottom < 80);
      } else {
        // Fallback
        setShowNavCta(window.scrollY > 450);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* ── NEBULA MOBILE HEADER (Only visible on Mobile < 768px) ── */}
      <header className={`fixed top-3 left-3 right-3 z-[100] md:hidden transition-all duration-500 ${isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center justify-between rounded-full bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 p-1.5 px-3 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)]">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-1.5 shrink-0">
            <img src={brandLogo} alt="" className="w-7 h-7 object-contain" />
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">SportGo</span>
          </a>

          {/* Right Actions: Sign In + Get Started + Hamburger Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a 
              href="/login" 
              onClick={handleNavigate('/login')} 
              className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-brand-primary px-2 py-1 transition-colors"
            >
              {t('landing.nav.signIn')}
            </a>
            
            <a 
              href="/register" 
              onClick={handleNavigate('/register')} 
              className="bg-gradient-to-r from-brand-primary to-blue-600 hover:from-brand-primary/90 hover:to-blue-600/90 text-white font-semibold rounded-full text-xs px-3 py-1.5 shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] whitespace-nowrap transition-all"
            >
              {t('landing.nav.getStarted')}
            </a>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors ml-0.5"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Nebula Style) */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden mt-2 rounded-2xl bg-white/45 dark:bg-white/[0.1] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] ${mobileMenuOpen ? 'max-h-60 opacity-100 p-3' : 'max-h-0 opacity-0 p-0 border-0 pointer-events-none'}`}>
          <nav className="flex flex-col gap-1">
            <a 
              href="#hero" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-800 dark:text-gray-200 hover:text-brand-primary py-2.5 px-3 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-all flex items-center justify-between"
            >
              <span>{t('landing.nav.home')}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-800 dark:text-gray-200 hover:text-brand-primary py-2.5 px-3 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-all flex items-center justify-between"
            >
              <span>{t('landing.nav.features')}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
            <a 
              href="#reasons" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-800 dark:text-gray-200 hover:text-brand-primary py-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-between"
            >
              <span>{t('landing.nav.reasons')}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </nav>
        </div>
      </header>

      {/* ── DESKTOP FIXED PILL TASKBAR (Only visible on Laptop/PC >= 768px) ── */}
      <header className={`hidden md:block fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ease-out ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="flex items-center rounded-full bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden">
          
          <nav className="flex items-center px-6 gap-8 shrink-0">
            <a href="#hero" className="text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors">{t('landing.nav.home')}</a>
            <a href="#features" className="text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors">{t('landing.nav.features')}</a>
            <a href="#reasons" className="text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors">{t('landing.nav.reasons')}</a>
          </nav>

          <div 
            className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-end overflow-hidden ${showNavCta ? 'max-w-[160px] opacity-100 pl-2 pr-0.5' : 'max-w-0 opacity-0 pl-0 pr-0 pointer-events-none'}`}
          >
            <a 
              href="/login" 
              onClick={handleNavigate('/login')} 
              className={`bg-gradient-to-r from-brand-primary to-blue-600 hover:from-brand-primary/90 hover:to-blue-600/90 text-white font-semibold rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-center text-xs sm:text-sm px-4 py-1.5 w-max whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] ${showNavCta ? 'translate-x-0' : 'translate-x-full'}`}
            >
              {t('landing.nav.getStarted')}
            </a>
          </div>
        </div>
      </header>

      {/* Fixed layers stay outside the fading wrapper: its transform would turn position:fixed into absolute. */}
      <StoryCanvas storyRef={storyRef} onChapterChange={handleChapterChange} />
      {/* Chapter rail, also outside the fading wrapper so it stays pinned. */}
      <nav className={`sg-story sg-story-rail ${isExiting ? 'opacity-0' : ''}`} aria-label={t('landing.story.scrollHint')}>
        {chapters.map((label, index) => <button key={label} type="button" className={activeChapter === index ? 'is-active' : ''} aria-current={activeChapter === index ? 'step' : undefined} onClick={() => scrollToChapter(index)}><span>{label}</span></button>)}
      </nav>
      <div ref={storyRef} className={`sg-story relative page-fade-in ${isExiting ? 'page-fade-out' : ''}`}>

        {/* ── DESKTOP STATIC HEADER (Only visible on Laptop/PC >= 768px) ── */}
        <div className="hidden md:flex absolute top-0 left-0 w-full items-center justify-between px-6 md:px-12 py-6 z-40">
          <div className="flex items-center gap-2">
            <img src={brandLogo} alt="" className="w-8 h-8 object-contain shrink-0" />
            <span className="font-bold text-xl tracking-tight">SportGo</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" onClick={handleNavigate('/login')} className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-primary transition-all duration-300">
              {t('landing.nav.signIn')}
            </a>
            <a href="/register" onClick={handleNavigate('/register')} className="bg-gradient-to-r from-brand-primary to-blue-600 hover:from-brand-primary/90 hover:to-blue-600/90 text-white font-bold rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] text-sm px-5 py-2.5">
              {t('landing.nav.signUp')}
            </a>
          </div>
        </div>

        {/* 0 · Hero */}
        <section id="hero" data-chapter="0" className="sg-story-section">
          <div className="sg-story-sticky">
            <div data-story-copy className="sg-story-copy is-left sg-story-hero">
              <p className="sg-story-eyebrow"><span className="sg-story-live" />{t('landing.story.sports.badminton')} · {t('landing.story.sports.pickleball')} · {t('landing.story.sports.football')}</p>
              <h1 className="sg-story-brand">Sport<span>Go</span></h1>
              <h2 className="sg-story-title">{t('landing.hero.heroTitle')}</h2>
              <p className="sg-story-text">{t('landing.hero.subtitle')}</p>
              <div id="hero-cta" className="sg-story-actions">
                <a href="/login" onClick={handleNavigate('/login')} className="sg-story-cta">{t('landing.hero.ctaStart')} <ArrowRight className="w-5 h-5" /></a>
                <button type="button" onClick={() => scrollToChapter(1)} className="sg-story-ghost">{t('landing.hero.ctaDemo')} <Sparkles className="w-4 h-4" /></button>
              </div>
            </div>
            <div data-story-copy className="sg-story-scroll-hint"><span />{t('landing.story.scrollHint')}</div>
          </div>
        </section>

        {/* 1 · Matchmaking */}
        <section id="features" data-chapter="1" className="sg-story-section">
          <div className="sg-story-sticky">
            <div data-story-copy className="sg-story-copy is-right">
              <p className="sg-story-eyebrow">{t('landing.story.match.eyebrow')}</p>
              <h2 className="sg-story-heading">{t('landing.story.match.title')}</h2>
              <p className="sg-story-text">{t('landing.story.match.text')}</p>
              <dl className="sg-story-stats">
                <div><dt>{t('landing.story.match.stat1')}</dt><dd>{t('landing.story.match.stat1Value')}</dd></div>
                <div><dt>{t('landing.story.match.stat2')}</dt><dd>{t('landing.story.match.stat2Value')}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        {/* 2 · Sports */}
        <section data-chapter="2" data-span="3" className="sg-story-section" style={{ '--span': 3 }}>
          <div className="sg-story-sticky">
            <div data-story-copy className="sg-story-copy is-left">
              <p className="sg-story-eyebrow">{t('landing.story.sports.eyebrow')}</p>
              <h2 className="sg-story-heading">{t('landing.story.sports.title')}</h2>
              <p className="sg-story-text">{t('landing.story.sports.text')}</p>
              <ul className="sg-story-sports">
                {[['badminton', '🏸', '-9,2.52'], ['pickleball', '🏓', '2.52,3.52'], ['football', '⚽', '3.52,99']].map(([key, emoji, range]) => <li key={key} data-active-range={range}><span aria-hidden="true">{emoji}</span>{t(`landing.story.sports.${key}`)}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 3 · Reputation */}
        <section id="reasons" data-chapter="3" className="sg-story-section">
          <div className="sg-story-sticky">
            <div data-story-copy className="sg-story-copy is-right">
              <p className="sg-story-eyebrow">{t('landing.story.trust.eyebrow')}</p>
              <h2 className="sg-story-heading">{t('landing.story.trust.title')}</h2>
              <p className="sg-story-text">{t('landing.story.trust.text')}</p>
              <ul className="sg-story-points">
                {['point1', 'point2', 'point3'].map((key) => <li key={key}><ShieldCheck className="w-4 h-4" />{t(`landing.story.trust.${key}`)}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 4 · Community */}
        <section data-chapter="4" className="sg-story-section">
          <div className="sg-story-sticky">
            <div data-story-copy className="sg-story-copy is-left">
              <p className="sg-story-eyebrow">{t('landing.story.community.eyebrow')}</p>
              <h2 className="sg-story-heading">{t('landing.story.community.title')}</h2>
              <p className="sg-story-text">{t('landing.story.community.text')}</p>
              <div className="sg-story-stickers" aria-hidden="true">
                {['like', 'fire', 'bolt', 'gg', 'trophy', 'haha', 'toang'].map((kind, index) => <span key={kind} style={{ '--i': index }}><SportSticker kind={kind} size={42} /></span>)}
              </div>
            </div>
          </div>
        </section>

        {/* 5 · Finale */}
        <section id="contact" data-chapter="5" className="sg-story-section is-last">
          <div className="sg-story-sticky">
            <div data-story-copy className="sg-story-copy is-center">
              <h2 className="sg-story-heading sg-story-final">{t('landing.story.finale.title')}</h2>
              <p className="sg-story-text">{t('landing.story.finale.text')}</p>
              <div className="sg-story-actions is-center">
                <a href="/register" onClick={handleNavigate('/register')} className="sg-story-cta">{t('landing.hero.ctaStart')} <ArrowRight className="w-5 h-5" /></a>
                <a href="/login" onClick={handleNavigate('/login')} className="sg-story-ghost">{t('landing.nav.signIn')}</a>
              </div>
            </div>
            <footer className="sg-story-footer">
              <img src={brandLogo} alt="" className="w-5 h-5 object-contain" />
              <span>SportGo</span>
              <a href="/privacy-policy">Privacy</a>
            </footer>
          </div>
        </section>
      </div>
    </>
  );
}

export default LandingPage;
