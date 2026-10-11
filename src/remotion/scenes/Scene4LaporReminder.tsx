import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoAspectRatio } from '../types';

interface SceneProps {
  aspectRatio: VideoAspectRatio;
}

export const Scene4LaporReminder: React.FC<SceneProps> = ({ aspectRatio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isPortrait = aspectRatio === '9:16';

  // Mascot animation
  const mascotSpring = spring({ frame, fps, config: { damping: 14 } });

  // Ticket card reveal
  const ticketSpring = spring({ frame: frame - 15, fps, config: { damping: 12 } });

  // Overdue Alert Banner pop-in with pulse
  const alertSpring = spring({ frame: frame - 45, fps, config: { damping: 10, stiffness: 120 } });
  const pulseOpacity = interpolate(Math.sin(frame / 6), [-1, 1], [0.85, 1]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden px-8">
      {/* Background Accent */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-rose-950/25 blur-[130px] pointer-events-none -top-10" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-950/40 blur-[130px] pointer-events-none -bottom-10" />

      {/* Header Badge */}
      <div className="relative z-10 text-center mb-5">
        <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider uppercase">
          Fitur Unggulan 2: Layanan & Tracking
        </span>
        <h2 className={`${isPortrait ? 'text-2xl' : 'text-3xl'} font-extrabold mt-1.5 text-white`}>
          Lapor Kendala & Reminder Jatuh Tempo
        </h2>
      </div>

      <div
        className={`relative z-10 flex ${
          isPortrait ? 'flex-col items-center gap-5 w-full max-w-sm' : 'flex-row items-center justify-center gap-10 max-w-5xl'
        }`}
      >
        {/* Mascot Standing */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ transform: `scale(${mascotSpring})` }}
        >
          <div className={`${isPortrait ? 'w-36 h-36' : 'w-52 h-52'} rounded-3xl bg-slate-900/80 border border-slate-700/80 p-3 shadow-2xl flex items-center justify-center`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/standing.png"
              alt="Mascot Standing"
              className="w-full h-full object-contain filter drop-shadow-lg"
            />
          </div>
        </div>

        {/* Interactive Cards Showcase */}
        <div className="flex flex-col gap-3.5 w-full max-w-md">
          {/* Overdue Reminder Alert Banner (Prominent) */}
          <div
            className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-900/80 to-red-900/80 border-2 border-rose-500 text-white shadow-xl"
            style={{
              transform: `scale(${Math.max(0, alertSpring)})`,
              opacity: pulseOpacity,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🚨</span>
              <div>
                <div className="text-xs font-black tracking-wide uppercase text-rose-200">
                  Sistem Deteksi Keterlambatan
                </div>
                <div className="text-sm font-bold text-white">
                  2 To-Do & 1 Tiket Melewati Jatuh Tempo!
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-rose-200 bg-rose-950/60 rounded-lg px-2.5 py-1">
              Tombol 1-klik untuk filter & penyelesaian seketika di dashboard.
            </div>
          </div>

          {/* Ticket Processing Card */}
          <div
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg space-y-2.5"
            style={{ transform: `scale(${Math.max(0, ticketSpring)})` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">#TIKET-PDS-202610-042</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-400/30">
                🔵 Crosscheck
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200">
              Koreksi Selisih Lembur Shift 3 - Unit Koja
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Target: 23 Okt 2026</span>
              <span className="text-emerald-400 font-medium">Auto-Sync Form Pegawai</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
