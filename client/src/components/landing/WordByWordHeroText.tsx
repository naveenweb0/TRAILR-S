import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Compass } from 'lucide-react';

interface WordByWordHeroTextProps {
  tagText?: string;
  headlineWords?: string[];
  manifestoText?: string;
}

export const WordByWordHeroText: React.FC<WordByWordHeroTextProps> = ({
  tagText = "TRAILR'S • DIRECT B2B INSTITUTE EXCURSIONS",
  headlineWords = ['We', 'lost', 'the', 'map', 'on', 'purpose.'],
  manifestoText = "Real learning doesn't happen along predictable routes. TRAILR'S connects schools and institutes directly to India's most extraordinary discovery zones, science observatories, living citadels, and wilderness terrains. Zero middleman markup. 100% verified safety.",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [revealedWordCount, setRevealedWordCount] = useState(0);

  useEffect(() => {
    // Immediate human-crafted entrance cascade
    const timer = setTimeout(() => setIsLoaded(true), 120);

    // Progressive step-in for initial view
    const intervals: NodeJS.Timeout[] = [];
    headlineWords.forEach((_, idx) => {
      const t = setTimeout(() => {
        setRevealedWordCount((prev) => Math.max(prev, idx + 1));
      }, 150 + idx * 130);
      intervals.push(t);
    });

    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      // As user scrolls, reveal any words or intensify illumination
      if (y > 30) {
        const extraWords = Math.floor(y / 40);
        setRevealedWordCount((prev) => Math.max(prev, Math.min(headlineWords.length, 3 + extraWords)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      clearTimeout(timer);
      intervals.forEach((t) => clearTimeout(t));
      window.removeEventListener('scroll', handleScroll);
    };
  }, [headlineWords.length]);

  const manifestoWords = manifestoText.split(' ');
  // Calculate manifesto reveal based on scroll
  const scrollRatio = Math.min(Math.max(scrollY / 350, 0), 1);
  const activeManifestoIndex = Math.floor(scrollRatio * manifestoWords.length);

  return (
    <div ref={containerRef} className="space-y-7 text-center max-w-4xl mx-auto select-none">
      {/* ─────────────────────────────────────────────────────────────
          CRISP WHITE TAG PILL (HIGH-CONTRAST HUMAN DESIGN)
      ───────────────────────────────────────────────────────────── */}
      <div className="inline-flex items-center justify-center">
        <div
          className={`inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-slate-950 shadow-[0_0_35px_rgba(255,255,255,0.4)] border border-white hover:scale-105 transition-all duration-700 ease-out ${
            isLoaded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
          }`}
        >
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
          <Compass className="w-4 h-4 text-blue-600 shrink-0 animate-spin-slow" />
          <span className="font-mono text-xs sm:text-[13px] font-black uppercase tracking-wider">
            {tagText}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold ml-1">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>EST. 2026</span>
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MONUMENTAL HEADLINE (WORD-BY-WORD SCROLL & ENTRANCE ANIMATION)
      ───────────────────────────────────────────────────────────── */}
      <h1 className="text-5xl sm:text-7xl lg:text-[86px] font-black tracking-tight leading-[1.03] text-white font-display">
        {headlineWords.map((word, idx) => {
          const isAccent =
            word.toLowerCase().includes('purpose') ||
            word.toLowerCase().includes('map') ||
            word.toLowerCase().includes('lost');
          const isWordRevealed = isLoaded && (idx < revealedWordCount || scrollY > 20);

          return (
            <span
              key={idx}
              className={`inline-block mr-3 sm:mr-5 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isWordRevealed
                  ? 'opacity-100 translate-y-0 scale-100 filter-none'
                  : 'opacity-0 translate-y-8 scale-90 blur-[2px]'
              } ${
                isAccent
                  ? 'bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(59,130,246,0.45)]'
                  : 'text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]'
              }`}
              style={{
                transitionDelay: `${idx * 80}ms`,
              }}
            >
              {word}
            </span>
          );
        })}
      </h1>

      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL MANIFESTO (ILLUMINATES WORD-BY-WORD ON SCROLL)
      ───────────────────────────────────────────────────────────── */}
      <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed pt-1">
        {manifestoWords.map((word, i) => {
          // Word reveals / lights up based on scroll progress or initial entrance
          const isLit = isLoaded && (i <= activeManifestoIndex + 8 || scrollY === 0);
          const isHighlight = isLoaded && i <= activeManifestoIndex + 2 && scrollY > 10;

          return (
            <span
              key={i}
              className={`inline-block mr-1.5 transition-all duration-500 ease-out ${
                isHighlight
                  ? 'text-white font-semibold opacity-100 scale-105 drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                  : isLit
                  ? 'text-slate-200 opacity-95 scale-100'
                  : 'text-slate-500 opacity-35 scale-95'
              }`}
              style={{
                transitionDelay: `${Math.min(i * 18, 450)}ms`,
              }}
            >
              {word}
            </span>
          );
        })}
      </p>
    </div>
  );
};
