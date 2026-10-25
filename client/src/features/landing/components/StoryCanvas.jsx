import { useEffect, useRef, useState } from 'react';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Fixed WebGL background driven by scroll. Each `[data-chapter]` section inside `storyRef`
 * is one chapter lasting `data-span` beats (default 1, one beat = the first section's height).
 * The scene receives a float beat (0 = first section centred). Copy blocks marked
 * `[data-story-copy]` stay fully visible through their chapter's beats and fade between chapters.
 */
export default function StoryCanvas({ storyRef, onChapterChange, halloween = false }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const halloweenRef = useRef(halloween);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let scene;
    let frame = 0;
    let disposed = false;
    let smoothBeat = 0;
    let lastBeat = 0;
    let lastActive = -1;
    let lastTime = performance.now();
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;

    const readBeat = () => {
      const sections = [...(storyRef.current?.querySelectorAll('[data-chapter]') || [])];
      if (!sections.length) return { value: 0, sections, ranges: [] };
      let start = 0;
      const ranges = sections.map((section) => {
        const span = Number(section.dataset.span) || 1;
        const range = [start, start + span - 1];
        start += span;
        return range;
      });
      const first = sections[0].getBoundingClientRect();
      const beatHeight = (first.height || window.innerHeight) / (Number(sections[0].dataset.span) || 1);
      // Beat b is reached when the viewport centre sits (b + 0.5) beats below the first section's top.
      const value = clamp((window.innerHeight / 2 - first.top) / beatHeight - 0.5, 0, start - 1);
      return { value, sections, ranges };
    };

    const paintCopy = (beat, sections, ranges) => {
      sections.forEach((section, index) => {
        const [from, to] = ranges[index];
        const distance = beat < from ? beat - from : beat > to ? beat - to : 0;
        const isEdge = (index === 0 && distance < 0) || (index === sections.length - 1 && distance > 0);
        const visibility = isEdge ? 1 : 1 - clamp((Math.abs(distance) - 0.3) / 0.22);
        section.querySelectorAll('[data-story-copy]').forEach((copy) => {
          copy.style.opacity = visibility.toFixed(3);
          copy.style.transform = `translate3d(0, ${(isEdge ? 0 : distance * -60).toFixed(1)}px, 0)`;
          copy.style.pointerEvents = visibility > 0.5 ? 'auto' : 'none';
        });
        section.style.setProperty('--story-local', distance.toFixed(3));
        // Items tagged data-active-range="from,to" light up while the chapter is inside that range.
        section.querySelectorAll('[data-active-range]').forEach((item) => {
          const [rangeFrom, rangeTo] = item.dataset.activeRange.split(',').map(Number);
          item.classList.toggle('is-active', beat >= rangeFrom && beat < rangeTo);
        });
      });
    };

    const onPointer = (event) => scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
    const onResize = () => scene?.resize(window.innerWidth, window.innerHeight);
    const theme = new MutationObserver(() => scene?.setTheme(document.documentElement.classList.contains('dark')));

    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const { value, sections, ranges } = readBeat();
      smoothBeat += (value - smoothBeat) * (reducedMotion ? 1 : Math.min(1, dt * 5));
      const velocity = (smoothBeat - lastBeat) / Math.max(dt, 0.001) * 0.016;
      lastBeat = smoothBeat;
      paintCopy(value, sections, ranges);
      const active = ranges.findIndex(([from, to]) => value < to + 0.5 && value >= from - 0.5);
      if (active !== lastActive) { lastActive = active; onChapterChange?.(active, value); }
      storyRef.current?.style.setProperty('--story-beat', smoothBeat.toFixed(3));
      scene?.update(smoothBeat, now / 1000, velocity);
    };

    // three.js is loaded on demand so other routes do not pay for it.
    import('../three/SportScene').then(({ default: SportScene }) => {
      if (disposed) return;
      try {
        scene = new SportScene(canvas, { dark: document.documentElement.classList.contains('dark'), lowPower, reducedMotion, halloween: halloweenRef.current });
        sceneRef.current = scene;
        onResize();
      } catch {
        setFailed(true);
      }
    }).catch(() => setFailed(true));

    frame = requestAnimationFrame(loop);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      theme.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [storyRef, onChapterChange]);

  // Switching mode only re-colours the running scene; it does not rebuild it.
  useEffect(() => {
    halloweenRef.current = halloween;
    sceneRef.current?.setMode(halloween);
  }, [halloween]);

  return <>
    <canvas ref={canvasRef} className={`sg-story-canvas ${failed ? 'is-hidden' : ''}`} aria-hidden="true" />
    <div className="sg-story-vignette" aria-hidden="true" />
  </>;
}
