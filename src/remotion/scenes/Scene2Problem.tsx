import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoAspectRatio } from '../types';

interface SceneProps {
  aspectRatio: VideoAspectRatio;
}

export const Scene2Problem: React.FC<SceneProps> = ({ aspectRatio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isPortrait = aspectRatio === '9:16';

  // Mascot thinking animation
  const mascotSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Staggered pop-in for pain points
  const p1Spring = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const p2Spring = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  const p3Spring = spring({ frame: frame - 70, fps, config: { damping: 12 } });

  // Solution banner reveal
  const solutionSpring = spring({ frame: frame - 120, fps, config: { damping: 12 } });

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden px-8">
      {/* Background Ambience */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-rose-950/30 blur-[130px] pointer-events-none -top-20" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-950/40 blur-[130px] pointer-events-none -bottom-20" />

      {/* Header Prompt */}
      <div className="relative z-10 text-center mb-6 max-w-2xl">
        <span className="px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold tracking-wider uppercase">
          Tantangan Pengelolaan Rutin
        </span>
        <h2 className={`${isPortrait ? 'text-2xl' : 'text-4xl'} font-bold mt-2 text-white`}>
          Beban Penggajian Setiap Bulannya
        </h2>
      </div>

      <div
        className={`relative z-10 flex ${
          isPortrait ? 'flex-col items-center gap-6 w-full max-w-sm' : 'flex-row items-center justify-center gap-12 max-w-5xl'
        }`}
      >
        {/* Mascot Thinking */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ transform: `scale(${mascotSpring})` }}
        >
          <div className={`${isPortrait ? 'w-40 h-40' : 'w-56 h-56'} rounded-3xl bg-slate-900/80 border border-slate-700/80 p-3 shadow-2xl flex items-center justify-center`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/thinking.png"
              alt="Mascot Thinking"
              className="w-full h-full object-contain filter drop-shadow-lg"
            />
          </div>
        </div>

        {/* Problem Stack Cards */}
        <div className="flex flex-col gap-3.5 w-full max-w-md">
          {/* Card 1 */}
          <div
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-lg"
            style={{ transform: `scale(${Math.max(0, p1Spring)})` }}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-lg font-bold shrink-0">
              📊
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Komparasi Gaji Rumit</h4>
              <p className="text-xs text-slate-400">Ribuan pegawai & 92 jenis komponen tunjangan per bulan.</p>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg"
            style={{ transform: `scale(${Math.max(0, p2Spring)})` }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-bold shrink-0">
              💬
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Pertanyaan Slip Gaji Berulang</h4>
              <p className="text-xs text-slate-400">Pegawai menanyakan rincian lembur & selisih THP setiap tgl 26.</p>
            </div>
          </div>

          {/* Card 3 */}
          <div
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-lg"
            style={{ transform: `scale(${Math.max(0, p3Spring)})` }}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-lg font-bold shrink-0">
              ⏰
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Risiko Terlewat Jatuh Tempo</h4>
              <p className="text-xs text-slate-400">Tiket kendala dan to-do list terlewat dari target cut-off.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solution Banner */}
      <div
        className="relative z-10 mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-xl flex items-center gap-2 border border-indigo-400/30"
        style={{ transform: `scale(${Math.max(0, solutionSpring)})` }}
      >
        <span>✨</span>
        <span>Solusi: Semuanya kini diotomasi secara cerdas & real-time!</span>
      </div>
    </div>
  );
};
