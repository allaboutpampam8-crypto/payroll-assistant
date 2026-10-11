import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoAspectRatio } from '../types';

interface SceneProps {
  aspectRatio: VideoAspectRatio;
}

export const Scene3FeaturesMacro: React.FC<SceneProps> = ({ aspectRatio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isPortrait = aspectRatio === '9:16';

  // Pop-in container
  const containerSpring = spring({ frame, fps, config: { damping: 14 } });

  // Number counter animation (interpolating up)
  const countVal = Math.round(
    interpolate(frame, [15, 60], [0, 14820450000], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Sheet tabs stagger
  const tab1 = spring({ frame: frame - 40, fps });
  const tab2 = spring({ frame: frame - 48, fps });
  const tab3 = spring({ frame: frame - 56, fps });
  const tab4 = spring({ frame: frame - 64, fps });

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden px-8">
      {/* Background Accent */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-950/30 blur-[130px] pointer-events-none -top-10" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-950/40 blur-[130px] pointer-events-none -bottom-10" />

      {/* Header Badge */}
      <div className="relative z-10 text-center mb-5">
        <span className="px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-bold tracking-wider uppercase">
          Fitur Unggulan 1: Intelijen Makro
        </span>
        <h2 className={`${isPortrait ? 'text-2xl' : 'text-3xl'} font-extrabold mt-1.5 text-white`}>
          Komparasi Multi-Bulan & Master Excel
        </h2>
      </div>

      {/* Main Card UI Showcase */}
      <div
        className={`relative z-10 w-full max-w-2xl rounded-3xl bg-slate-900/90 border border-slate-700/80 p-6 shadow-2xl backdrop-blur-xl ${
          isPortrait ? 'space-y-4' : 'space-y-5'
        }`}
        style={{ transform: `scale(${containerSpring})` }}
      >
        {/* Top Header of Card */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-lg">
              🏢
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Total Pengeluaran THP Perusahaan</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                {formatRupiah(countVal)}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
              🔺 +Rp 142.500.000 vs Lalu
            </span>
            <span className="text-[11px] text-slate-400 mt-1">Otomatis Terkalkulasi</span>
          </div>
        </div>

        {/* Feature Component Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400">Pegawai Terbayar</div>
            <div className="text-lg font-bold text-white mt-0.5">3.418 Orang</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400">Komponen Tunjangan</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">92 Rincian</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-400">Toleransi Selisih</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">100% Akurat</div>
          </div>
        </div>

        {/* Multi-Sheet Excel Visual Showcase */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <span>📗</span>
              <span>Export Multi-Month Master Excel (Persheet Bulanan)</span>
            </div>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-md font-semibold">
              Siap Rapat
            </span>
          </div>

          {/* Animated Sheet Tabs */}
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs"
              style={{ transform: `scale(${Math.max(0, tab1)})` }}
            >
              Mei 2026
            </div>
            <div
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700"
              style={{ transform: `scale(${Math.max(0, tab2)})` }}
            >
              Juni 2026
            </div>
            <div
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700"
              style={{ transform: `scale(${Math.max(0, tab3)})` }}
            >
              Juli 2026
            </div>
            <div
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 hidden sm:block"
              style={{ transform: `scale(${Math.max(0, tab4)})` }}
            >
              Agustus 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
