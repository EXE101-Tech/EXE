import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Gamepad2, Calendar, Users, Zap, Sparkles, MapPin, Shield, ArrowUpRight, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function LandingPage() {
  const { t } = useTranslation();
  const [showNavCta, setShowNavCta] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const navigate = useNavigate();

  const handleNavigate = (path) => (e) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      navigate(path);
    }, 400); // 400ms is slightly less than 500ms transition to ensure it fires smoothly
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
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
      <header className={`fixed top-3 left-3 right-3 z-[100] md:hidden transition-all duration-500 ${!isMounted || isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center justify-between rounded-full bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 p-1.5 px-3 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)]">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-primary to-sky-500 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xs">S</span>
            </div>
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
      <header className={`hidden md:block fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ease-out ${!isMounted || isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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

      <div className={`w-full h-full relative page-fade-in ${isExiting ? 'page-fade-out' : ''}`}>
        {/* ── DESKTOP STATIC HEADER (Only visible on Laptop/PC >= 768px) ── */}
        <div className="hidden md:flex absolute top-0 left-0 w-full items-center justify-between px-6 md:px-12 py-6 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-sky-500 flex items-center justify-center shrink-0 shadow-lg">
              <span className="text-white font-black text-sm">S</span>
            </div>
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

      {/* Hero Section */}
      <main id="hero" className="relative pt-48 pb-32 px-4 flex flex-col items-center justify-center text-center z-10">

        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-4 leading-none animate-in fade-in slide-in-from-bottom-4 duration-700">
          Sport<span className="text-[#74C365]">Go</span>
        </h1>
        
        <h2 className="text-base sm:text-xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-6 whitespace-nowrap animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          {t('landing.hero.heroTitle')}
        </h2>
        
        <p className="text-lg text-slate-500 dark:text-gray-400 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          {t('landing.hero.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300" id="hero-cta">
          <a href="/login" onClick={handleNavigate('/login')} className="bg-gradient-to-r from-brand-primary to-blue-600 text-white hover:opacity-95 font-bold px-8 py-3.5 rounded-full transition-all flex items-center gap-2 w-full sm:w-auto justify-center shadow-lg shadow-brand-primary/25">
            {t('landing.hero.ctaStart')} <ArrowRight className="w-5 h-5" />
          </a>
          <a href="#features" className="px-8 py-3.5 rounded-full font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors w-full sm:w-auto flex items-center justify-center gap-2">
            {t('landing.hero.ctaDemo')} <Calendar className="w-4 h-4 text-brand-primary" />
          </a>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">{t('landing.features.headerTitle')}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-2xl mx-auto">{t('landing.features.headerSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 rounded-3xl hover:border-brand-primary/40 transition-all group duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/20 flex items-center justify-center mb-6 text-brand-primary group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('landing.features.f1Title')}</h3>
            <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">{t('landing.features.f1Desc')}</p>
          </div>
          <div className="glass-panel p-8 rounded-3xl hover:border-blue-500/40 transition-all group duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('landing.features.f2Title')}</h3>
            <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">{t('landing.features.f2Desc')}</p>
          </div>
          <div className="glass-panel p-8 rounded-3xl hover:border-amber-500/40 transition-all group duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 text-amber-500 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('landing.features.f3Title')}</h3>
            <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">{t('landing.features.f3Desc')}</p>
          </div>
        </div>
      </section>

      {/* Why Choose SportGo Section */}
      <section id="reasons" className="py-24 px-4 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">{t('landing.reasons.headerTitle')}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">{t('landing.reasons.headerSubtitle')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 rounded-3xl hover:border-brand-primary/30 transition-all text-center group">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 mx-auto flex items-center justify-center mb-6 text-brand-primary group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{t('landing.reasons.r1Title')}</h4>
            <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">{t('landing.reasons.r1Desc')}</p>
          </div>
          <div className="glass-panel p-8 rounded-3xl hover:border-brand-primary/30 transition-all text-center group">
            <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 mx-auto flex items-center justify-center mb-6 text-sky-500 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{t('landing.reasons.r2Title')}</h4>
            <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">{t('landing.reasons.r2Desc')}</p>
          </div>
          <div className="glass-panel p-8 rounded-3xl hover:border-brand-primary/30 transition-all text-center group">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center mb-6 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{t('landing.reasons.r3Title')}</h4>
            <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">{t('landing.reasons.r3Desc')}</p>
          </div>
        </div>
      </section>


      {/* Footer / CTA */}
      <footer id="contact" className="py-12 px-4 relative z-10 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-sm text-slate-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-primary to-sky-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">S</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">SportGo</span>
          </div>
        </div>
      </footer>

    </div>
    </>
  );
}

export default LandingPage;
