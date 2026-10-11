import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoAspectRatio } from '../types';

interface SceneProps {
  aspectRatio: VideoAspectRatio;
  companyName: string;
  assistantName: string;
}

export const Scene6Outro: React.FC<SceneProps> = ({
  aspectRatio,
  companyName,
  assistantName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isPortrait = aspectRatio === '9:16';

  // Mascot Mantap Pop + Bounce
  const mascotSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  // Staggered pill badges
  const b1 = spring({ frame: frame - 15, fps });
  const b2 = spring({ frame: frame - 25, fps });
  const b3 = spring({ frame: frame - 35, fps });
  const b4 = spring({ frame: frame - 45, fps });

  // Floating effect
  const floatY = Math.sin(frame / 12) * 6;

  // Final glow scale
  const glowScale = interpolate(frame, [0, 60], [0.8, 1.2], {
    extrapolateRight: 'clamp',
  });

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden px-8">
      {/* Background Animated Gradient */}
      <div
        className="absolute w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-indigo-600/30 to-emerald-500/20 blur-[130px] pointer-events-none"
        style={{ transform: `scale(${glowScale})` }}
      />

      <div
        className={`relative z-10 flex ${
          isPortrait ? 'flex-col items-center text-center gap-6' : 'flex-row items-center justify-center gap-12 max-w-4xl'
        }`}
      >
        {/* Mascot Mantap */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{
            transform: `scale(${mascotSpring}) translateY(${floatY}px)`,
          }}
        >
          <div className={`${isPortrait ? 'w-44 h-44' : 'w-60 h-60'} rounded-3xl bg-slate-900/80 border-2 border-emerald-500/40 p-4 shadow-2xl flex items-center justify-center backdrop-blur-md`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/mantap.png"
              alt="Mascot Mantap"
              className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* Text & Value Props */}
        <div className={`flex flex-col ${isPortrait ? 'items-center text-center' : 'items-start text-left'}`}>
          <div className="px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold tracking-wider uppercase mb-2">
            Solusi Penggajian Cerdas
          </div>

          <h2 className={`${isPortrait ? 'text-3xl' : 'text-4xl'} font-black text-white leading-tight mb-2`}>
            {assistantName}
          </h2>

          <p className="text-slate-300 text-sm max-w-md font-medium mb-5">
            Memberikan kemudahan, kecepatan, dan transparansi payroll untuk seluruh insan {companyName}.
          </p>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
            <div
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200"
              style={{ transform: `scale(${Math.max(0, b1)})` }}
            >
              <span className="text-emerald-400">⚡</span> Cepat & Otomatis
            </div>
            <div
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200"
              style={{ transform: `scale(${Math.max(0, b2)})` }}
            >
              <span className="text-indigo-400">🎯</span> 100% Akurat
            </div>
            <div
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200"
              style={{ transform: `scale(${Math.max(0, b3)})` }}
            >
              <span className="text-cyan-400">🤖</span> Siap 24/7 di Telegram
            </div>
            <div
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200"
              style={{ transform: `scale(${Math.max(0, b4)})` }}
            >
              <span className="text-amber-400">⏰</span> Anti Lupa Deadline
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
