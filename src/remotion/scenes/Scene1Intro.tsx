import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoAspectRatio } from '../types';

interface SceneProps {
  aspectRatio: VideoAspectRatio;
  companyName: string;
  assistantName: string;
}

export const Scene1Intro: React.FC<SceneProps> = ({
  aspectRatio,
  companyName,
  assistantName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isPortrait = aspectRatio === '9:16';

  // Animasi Masuk Mascot (Pop + Spring Bounce)
  const mascotSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Animasi Headline (Fade + Slide Up)
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleTranslateY = interpolate(frame, [15, 35], [40, 0], {
    extrapolateRight: 'clamp',
  });

  // Animasi Subtitle Tag
  const tagScale = spring({
    frame: frame - 35,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  // Subtle floating animation untuk mascot
  const floatY = Math.sin(frame / 15) * 8;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden font-sans select-none px-8">
      {/* Background Animated Gradient Orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-indigo-600/25 blur-[120px] pointer-events-none"
        style={{
          transform: `translate(${Math.sin(frame / 30) * 40}px, ${Math.cos(frame / 30) * 40}px)`,
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none bottom-10 right-10"
        style={{
          transform: `translate(${Math.cos(frame / 25) * 30}px, ${Math.sin(frame / 25) * 30}px)`,
        }}
      />

      {/* Main Content Layout */}
      <div
        className={`relative z-10 flex ${
          isPortrait ? 'flex-col items-center text-center gap-6' : 'flex-row items-center justify-center gap-14 max-w-5xl'
        }`}
      >
        {/* Mascot Container */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{
            transform: `scale(${mascotSpring}) translateY(${floatY}px)`,
          }}
        >
          {/* Glowing Aura Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 opacity-40 blur-xl scale-110 animate-pulse" />
          
          <div className={`${isPortrait ? 'w-48 h-48' : 'w-64 h-64'} relative rounded-3xl bg-slate-900/80 border-2 border-indigo-500/50 p-4 shadow-2xl flex items-center justify-center backdrop-blur-md`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/waving.png"
              alt="Maskot Asisten"
              className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* Text Container */}
        <div
          className={`flex flex-col ${isPortrait ? 'items-center text-center' : 'items-start text-left'}`}
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
          }}
        >
          {/* Company Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-sm font-semibold tracking-wide uppercase mb-3 shadow-inner"
            style={{ transform: `scale(${Math.max(0, tagScale)})` }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {companyName}
          </div>

          {/* Main Title */}
          <h1 className={`${isPortrait ? 'text-4xl' : 'text-5xl'} font-extrabold tracking-tight text-white leading-tight mb-3`}>
            {assistantName}
          </h1>

          {/* Catchphrase */}
          <p className={`${isPortrait ? 'text-lg max-w-sm' : 'text-xl max-w-xl'} text-slate-300 font-medium leading-relaxed`}>
            Platform Intelijen Pengelolaan Payroll, Rekapitulasi Data, & Layanan Kendala Pegawai Terpadu.
          </p>

          {/* Feature Pillars Pill */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-200">
              ⚡ Multi-Month Comparison
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-200">
              🤖 Telegram AI Bot 24/7
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-200">
              📊 92+ Komponen Gaji
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
