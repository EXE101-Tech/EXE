// Light Halloween backdrop for the login and register pages: a moon, drifting pumpkins and bats.
// Plain SVG and CSS keep it cheap; the 3D scene is only used on the landing page.
const PUMPKINS = [
  { left: '6%', top: '64%', size: 54, delay: '0s' },
  { left: '84%', top: '16%', size: 40, delay: '-3s' },
  { left: '90%', top: '72%', size: 64, delay: '-6s' },
  { left: '12%', top: '14%', size: 34, delay: '-9s' },
];
const BATS = [
  { left: '20%', top: '10%', size: 30, delay: '0s' },
  { left: '70%', top: '6%', size: 22, delay: '-4s' },
  { left: '48%', top: '22%', size: 18, delay: '-7s' },
  { left: '34%', top: '44%', size: 16, delay: '-2s' },
];

function Pumpkin() {
  return <svg viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="32" cy="36" rx="26" ry="22" fill="#ff7a1a" />
    <ellipse cx="20" cy="36" rx="8" ry="20" fill="#ff9a3c" opacity=".7" />
    <ellipse cx="44" cy="36" rx="8" ry="20" fill="#e5600d" opacity=".7" />
    <rect x="29" y="8" width="6" height="10" rx="2" fill="#4d3b1f" />
    <path d="M20 30l5 5-5 4zM44 30l-5 5 5 4z" fill="#ffd36b" />
    <path d="M22 46q5-4 10 0 5-4 10 0q-5 6-10 2-5 4-10-2z" fill="#ffd36b" />
  </svg>;
}

function Bat() {
  return <svg viewBox="0 0 48 24" aria-hidden="true">
    <path d="M24 9c-3-4-7-6-12-4 2 2 2 4 1 6-4-2-7 0-11 2 3 1 5 3 6 6 3-2 6-2 9-1 1-2 3-3 5-3s4 1 5 3c3-1 6-1 9 1 1-3 3-5 6-6-4-2-7-4-11-2-1-2-1-4 1-6-5-2-9 0-12 4z" fill="#120818" />
  </svg>;
}

export default function HalloweenBackdrop() {
  return <div className="sg-auth-halloween" aria-hidden="true">
    <div className="sg-auth-moon" />
    {PUMPKINS.map((item, index) => <span key={`p${index}`} className="sg-auth-float" style={{ left: item.left, top: item.top, width: item.size, height: item.size, animationDelay: item.delay }}><Pumpkin /></span>)}
    {BATS.map((item, index) => <span key={`b${index}`} className="sg-auth-bat" style={{ left: item.left, top: item.top, width: item.size, height: item.size / 2, animationDelay: item.delay }}><Bat /></span>)}
  </div>;
}
