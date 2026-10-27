import { useEffect, useId, useRef, useState } from 'react';
import { Heart, SmilePlus } from 'lucide-react';

// SportGo's own sticker set for posts. Keys must match POST_REACTIONS on the server.
const POST_REACTIONS = [
  { key: 'like', label: 'Thích', color: '#e11d48', from: '#ff6b8b', to: '#e11d48' },
  { key: 'fire', label: 'Cháy quá', color: '#f97316', from: '#ffc046', to: '#ff4d1a' },
  { key: 'bolt', label: 'Bùng nổ', color: '#3b6cf6', from: '#6ea8ff', to: '#3b5bdb' },
  { key: 'gg', label: 'Chơi hay', color: '#059669', from: '#4ade9b', to: '#059669' },
  { key: 'trophy', label: 'Vô địch', color: '#d97706', from: '#fde047', to: '#f59e0b' },
  { key: 'haha', label: 'Haha', color: '#ca8a04', from: '#ffe066', to: '#f7b500' },
  { key: 'toang', label: 'Toang', color: '#7c3aed', from: '#c4b5fd', to: '#7c3aed' },
];
const BY_KEY = Object.fromEntries(POST_REACTIONS.map((item) => [item.key, item]));

const INK = '#1f2440';

function Glyph({ kind }) {
  switch (kind) {
    case 'like':
      return <path d="M20 29.5C10 22.6 9.6 14.6 14.6 12.6c2.8-1.1 4.6.4 5.4 2.2.8-1.8 2.6-3.3 5.4-2.2 5 2 4.6 10-5.4 16.9Z" fill="#fff" />;
    case 'fire':
      return <>
        <path d="M20 8.5c2.2 5.2 8.3 7.4 8.3 14.6 0 5-3.8 8.4-8.3 8.4s-8.3-3.3-8.3-8c0-3.6 2-5.6 3.7-7.2.1 2.6 1.1 4 2.6 4.6-.6-5 .9-9.4 2-12.4Z" fill="#fff" />
        <path d="M20 19.6c1 3 4.2 4.1 4.2 6.9 0 2.3-1.9 3.8-4.2 3.8s-4.2-1.4-4.2-3.4c0-1.8 1.5-2.9 2.4-3.9.3 1.4 1 2 1.8 2.3-.4-1.8-.4-3.9 0-5.7Z" fill="#ff8a1f" />
      </>;
    case 'bolt':
      return <path d="M22.8 7.6 12.2 22.2h6.9l-2.3 10.2 11.2-15.4h-7.1Z" fill="#ffd84d" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />;
    case 'gg':
      return <>
        <text x="20" y="25.6" textAnchor="middle" fontFamily="'Barlow Condensed', Inter, sans-serif" fontSize="16" fontWeight="900" letterSpacing=".5" fill="#fff">GG</text>
        <path d="m30.6 8.4.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z" fill="#fff" />
      </>;
    case 'trophy':
      return <>
        <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round"><path d="M14 13.2h-2.6c0 3.8 1.5 5.4 3.4 5.8" /><path d="M26 13.2h2.6c0 3.8-1.5 5.4-3.4 5.8" /></g>
        <path d="M13.8 10.5h12.4v5.6c0 3.9-2.7 6.6-6.2 6.6s-6.2-2.7-6.2-6.6Z" fill="#fff" />
        <path d="M18.6 22.2h2.8v3.6h-2.8z" fill="#fff" />
        <rect x="14.6" y="25.6" width="10.8" height="3.4" rx="1.2" fill="#fff" />
        <path d="m20 12.6 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3Z" fill="#f59e0b" />
      </>;
    case 'haha':
      return <>
        <g fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round"><path d="M13.2 17.2q2-2.6 4 0" /><path d="M22.8 17.2q2-2.6 4 0" /></g>
        <path d="M12.8 21.2h14.4c0 4.6-3.1 7.6-7.2 7.6s-7.2-3-7.2-7.6Z" fill={INK} />
        <path d="M16.4 26.2q3.6-2.6 7.2 0-1.5 2.4-3.6 2.4t-3.6-2.4Z" fill="#ff6b81" />
        <g fill="#5bc0ff"><path d="M10.2 18.6c.9 1.6 1.6 2.6 1.6 3.4a1.6 1.6 0 0 1-3.2 0c0-.8.7-1.8 1.6-3.4Z" /><path d="M29.8 18.6c.9 1.6 1.6 2.6 1.6 3.4a1.6 1.6 0 0 1-3.2 0c0-.8.7-1.8 1.6-3.4Z" /></g>
      </>;
    case 'toang':
      return <>
        <circle cx="20" cy="21" r="10" fill="#fff4d6" />
        <g fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round"><path d="M14.4 16.6l3-1.2" /><path d="M25.6 16.6l-3-1.2" /><path d="M15 25.6q1.25-1.4 2.5 0t2.5 0 2.5 0 2.5 0" /></g>
        <circle cx="16.4" cy="19.6" r="1.3" fill={INK} /><circle cx="23.6" cy="19.6" r="1.3" fill={INK} />
        <path d="M28 8.6c1.6 2.6 2.7 4.2 2.7 5.4a2.7 2.7 0 0 1-5.4 0c0-1.2 1.1-2.8 2.7-5.4Z" fill="#5bc0ff" stroke="#fff" strokeWidth=".8" />
      </>;
    default:
      return null;
  }
}

export function SportSticker({ kind, size = 32, className = '' }) {
  const meta = BY_KEY[kind] || BY_KEY.like;
  const gradientId = `${useId().replaceAll(':', '')}-${meta.key}`;
  return <svg viewBox="0 0 40 40" width={size} height={size} className={`sg-sticker ${className}`} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={meta.from} /><stop offset="1" stopColor={meta.to} /></linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18.4" fill={`url(#${gradientId})`} stroke="#fff" strokeWidth="1.8" />
    <ellipse cx="15" cy="10.5" rx="7" ry="3.2" fill="#fff" opacity=".22" />
    <Glyph kind={meta.key} />
  </svg>;
}

// Small stacked summary of the most-used stickers on a post.
export function ReactionSummary({ counts = {}, total = 0 }) {
  const top = POST_REACTIONS.filter(({ key }) => counts[key] > 0).sort((a, b) => counts[b.key] - counts[a.key]).slice(0, 3);
  if (!total) return null;
  const breakdown = POST_REACTIONS.filter(({ key }) => counts[key] > 0).map(({ key, label }) => `${label}: ${counts[key]}`).join(' · ');
  return <span className="sg-reaction-summary" title={breakdown || undefined}>
    <span className="sg-reaction-summary-stack">{(top.length ? top : [BY_KEY.like]).map(({ key }) => <SportSticker key={key} kind={key} size={20} />)}</span>
    <span className="tabular-nums">{total}</span>
  </span>;
}

const LONG_PRESS_MS = 420;

/**
 * Tap toggles the current sticker (default "Thích"); hover, long-press or the smiley
 * button opens the sticker bar to pick another one.
 */
export function ReactionButton({ myReaction, disabled, onReact }) {
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const hoverTimer = useRef(null);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  const root = useRef(null);
  const current = myReaction ? BY_KEY[myReaction] || BY_KEY.like : null;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);
  useEffect(() => () => { clearTimeout(hoverTimer.current); clearTimeout(pressTimer.current); }, []);

  const choose = (key) => {
    setOpen(false);
    if (key) setBurst((value) => value + 1);
    onReact(key);
  };
  const scheduleOpen = (value, delay) => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setOpen(value), delay); };

  return <div
    ref={root}
    className="sg-reaction"
    onMouseEnter={(event) => { if (event.nativeEvent.pointerType !== 'touch') scheduleOpen(true, 450); }}
    onMouseLeave={() => scheduleOpen(false, 300)}
  >
    {open && <div className="sg-reaction-picker" role="menu" aria-label="Chọn cảm xúc">
      {POST_REACTIONS.map((item, index) => <button
        key={item.key}
        type="button"
        role="menuitemradio"
        aria-checked={myReaction === item.key}
        aria-label={item.label}
        disabled={disabled}
        className={`sg-reaction-option ${myReaction === item.key ? 'is-selected' : ''}`}
        style={{ '--delay': `${index * 32}ms` }}
        onClick={() => choose(myReaction === item.key ? null : item.key)}
      >
        <span className="sg-reaction-option-label">{item.label}</span>
        <SportSticker kind={item.key} size={38} />
      </button>)}
    </div>}
    <button
      type="button"
      disabled={disabled}
      aria-pressed={Boolean(current)}
      className={`sg-reaction-trigger ${current ? 'is-active' : ''}`}
      style={current ? { color: current.color } : undefined}
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') return;
        longPressed.current = false;
        pressTimer.current = setTimeout(() => { longPressed.current = true; setOpen(true); }, LONG_PRESS_MS);
      }}
      onPointerUp={() => clearTimeout(pressTimer.current)}
      onPointerLeave={() => clearTimeout(pressTimer.current)}
      onContextMenu={(event) => { if (longPressed.current) event.preventDefault(); }}
      onClick={() => {
        if (longPressed.current) { longPressed.current = false; return; }
        choose(current ? null : 'like');
      }}
    >
      {current ? <SportSticker key={burst} kind={current.key} size={22} className="sg-reaction-pop" /> : <Heart className="h-5 w-5" />}
      {current ? current.label : 'Thích'}
    </button>
    <button type="button" disabled={disabled} className="sg-reaction-more" aria-label="Chọn cảm xúc khác" aria-expanded={open} onClick={() => { clearTimeout(hoverTimer.current); setOpen(true); }}>
      <SmilePlus className="h-4 w-4" />
    </button>
  </div>;
}
