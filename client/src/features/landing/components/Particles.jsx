import { useEffect, useState, memo } from 'react';

const Particles = memo(function Particles() {
  const [particles, setParticles] = useState([]);
  
  // Create static particle data once
  useEffect(() => {
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      top: Math.random() * 100 + '%',
      animationDuration: (Math.random() * 15 + 10) + 's', // 10s to 25s
      animationDelay: (Math.random() * 5) + 's',
      opacity: Math.random() * 0.4 + 0.3, // 0.3 to 0.7
      size: Math.random() * 4 + 2 + 'px' // 2px to 6px
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-sky-400 dark:bg-[#74C365] shadow-[0_0_10px_#38BDF8,0_0_18px_rgba(0,240,255,0.5)] dark:shadow-[0_0_10px_#74C365,0_0_18px_rgba(116,195,101,0.6)] theme-transition"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `floatUp ${p.animationDuration} ease-in-out infinite alternate ${p.animationDelay}`
          }}
        />
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) translateX(0) scale(1); }
          100% { transform: translateY(-100px) translateX(20px) scale(1.2); }
        }
      `}</style>
    </div>
  );
});

export default Particles;
