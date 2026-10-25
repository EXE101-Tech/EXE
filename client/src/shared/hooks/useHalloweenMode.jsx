import { useCallback, useEffect, useState } from 'react';

const MODE_KEY = 'sportgo-landing-mode';

// Halloween is on by default during the season (20 Oct – 2 Nov); a visitor's own choice always wins.
function readMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved) return saved === 'halloween';
  } catch { /* private mode */ }
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  return (month === 9 && day >= 20) || (month === 10 && day <= 2);
}

/**
 * Shared Halloween / default switch for the public pages (landing, login, register).
 * It keeps the page-level `data-landing-mode` attribute in sync for the CSS, and tells the
 * public shell (sportgo:landing-mode) so it can force the dark look while Halloween is on.
 */
export default function useHalloweenMode() {
  const [halloween, setHalloween] = useState(readMode);

  useEffect(() => {
    document.documentElement.dataset.landingMode = halloween ? 'halloween' : 'default';
    window.dispatchEvent(new CustomEvent('sportgo:landing-mode', { detail: halloween }));
  }, [halloween]);

  useEffect(() => () => {
    delete document.documentElement.dataset.landingMode;
    window.dispatchEvent(new CustomEvent('sportgo:landing-mode', { detail: false }));
  }, []);

  const chooseMode = useCallback((next) => {
    setHalloween(next);
    try { localStorage.setItem(MODE_KEY, next ? 'halloween' : 'default'); } catch { /* private mode */ }
  }, []);

  return [halloween, chooseMode];
}
