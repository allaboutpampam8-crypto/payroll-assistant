import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoAspectRatio } from '../types';

interface SceneProps {
  aspectRatio: VideoAspectRatio;
}

export const Scene5TelegramAI: React.FC<SceneProps> = ({ aspectRatio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isPortrait = aspectRatio === '9:16';

  // Chat message 1 (User /cek 98123)
  const chat1Spring = spring({ frame: frame - 10, fps, config: { damping: 12 } });

  // Chat message 2 (Bot typing indicator)
  const typingOpacity = interpolate(frame, [25, 45], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Chat message 3 (Bot Answer breakdown)
  const chat2Spring = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  // Floating AI badge
  const aiBadgeSpring = spring({ frame: frame - 80, fps, config: { damping: 12 } });

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden px-8">
      {/* Background Accent */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-950/25 blur-[130px] pointer-events-none -top-10" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-950/40 blur-[130px] pointer-events-none -bottom-10" />

      {/* Header Badge */}
      <div className="relative z-10 text-center mb-5">
        <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold tracking-wider uppercase">
          Fitur Unggulan 3: AI Bot 24/7
        </span>
        <h2 className={`${isPortrait ? 'text-2xl' : 'text-3xl'} font-extrabold mt-1.5 text-white`}>
          Bot Telegram & Gemini AI Assistant
        </h2>
      </div>

      {/* Mock Telegram Chat Interface */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-3xl bg-slate-900/95 border border-slate-700/80 p-5 shadow-2xl backdrop-blur-xl ${
          isPortrait ? 'space-y-3' : 'space-y-4'
        }`}
      >
        {/* Telegram Header Bar */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            ✈️
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>@AssistenPampamBot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-sky-400">Online • Siap Menjawab 24 Jam</div>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="space-y-3">
          {/* User Message */}
          <div
            className="flex justify-end"
            style={{ transform: `scale(${Math.max(0, chat1Spring)})` }}
          >
            <div className="rounded-2xl rounded-tr-xs bg-indigo-600 text-white px-4 py-2 text-xs font-mono font-medium shadow-md">
              /cek 98123
            </div>
          </div>

          {/* Bot Typing (Transient) */}
          {frame >= 20 && frame <= 45 && (
            <div
              className="flex items-center gap-2 text-xs text-slate-400 px-3 py-1 bg-slate-800/60 rounded-xl w-fit"
              style={{ opacity: typingOpacity }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce delay-200" />
              <span>Memproses data payroll...</span>
            </div>
          )}

          {/* Bot Answer Message */}
          <div
            className="flex justify-start"
            style={{ transform: `scale(${Math.max(0, chat2Spring)})` }}
          >
            <div className="rounded-2xl rounded-tl-xs bg-slate-800 border border-slate-700 text-slate-200 p-3.5 text-xs shadow-lg space-y-1.5 max-w-sm">
              <div className="font-bold text-sky-400 flex items-center justify-between">
                <span>👤 RINCIAN GAJI PEGAWAI</span>
                <span className="text-[10px] text-slate-400">Oktober 2026</span>
              </div>
              <div className="text-white font-semibold">Budi Santoso • NRP: 98123</div>
              <div className="text-[11px] text-slate-300">Unit: Terminal Petikemas Surabaya</div>
              <div className="border-t border-slate-700/80 pt-1.5 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Take Home Pay:</span>
                <span className="text-emerald-400 font-bold text-sm">Rp 7.850.000</span>
              </div>
              <div className="text-[10px] text-slate-400">
                (Upah Pokok, Lembur 42 Jam, 12 Tunjangan Terverifikasi)
              </div>
            </div>
          </div>
        </div>

        {/* AI Capabilities Tag */}
        <div
          className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80"
          style={{ transform: `scale(${Math.max(0, aiBadgeSpring)})` }}
        >
          <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
            <span>✨</span> Didukung Gemini AI Multimodal
          </span>
          <span className="text-[11px] text-slate-400">
            Tanya bahasa santai langsung dijawab!
          </span>
        </div>
      </div>
    </div>
  );
};
