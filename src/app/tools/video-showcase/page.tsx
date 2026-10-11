'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Player, PlayerRef } from '@remotion/player';
import {
  ChevronLeft,
  Play,
  RotateCcw,
  Smartphone,
  Monitor,
  Sparkles,
  Layers,
  Clock,
  Download,
  Info,
} from 'lucide-react';
import { ShowcaseComposition } from '@/remotion/ShowcaseComposition';
import {
  TOTAL_DURATION_FRAMES,
  VIDEO_FPS,
  VideoAspectRatio,
} from '@/remotion/types';

export default function VideoShowcasePage() {
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [companyName, setCompanyName] = useState('PT Pelindo Daya Sejahtera');
  const [assistantName, setAssistantName] = useState('Asisten Payroll PDS');
  const playerRef = useRef<PlayerRef>(null);

  const isPortrait = aspectRatio === '9:16';
  const compWidth = isPortrait ? 1080 : 1920;
  const compHeight = isPortrait ? 1920 : 1080;

  // Jump to specific scene in player
  const jumpToScene = (startFrame: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(startFrame);
    }
  };

  const scenes = [
    { title: '1. Intro & Brand', frame: 0, desc: 'Hook visual, maskot & slogan' },
    { title: '2. Masalah & Tantangan', frame: 250, desc: 'Beban rekapitulasi data' },
    { title: '3. Makro & Master Excel', frame: 520, desc: 'Komparasi multi-bulan & THP' },
    { title: '4. Lapor & Reminder', frame: 820, desc: 'Tiket kendala & overdue alert' },
    { title: '5. Telegram & AI Bot', frame: 1120, desc: 'Chat /cek & Gemini AI 24/7' },
    { title: '6. Penutup (Outro)', frame: 1420, desc: 'Ringkasan keunggulan' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
            <div className="h-5 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-sm font-bold text-white flex items-center gap-2">
                  Remotion Motion Graphic Studio
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    Live React Video
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Video penjelasan & showcase interaktif aplikasi Asisten Payroll
                </p>
              </div>
            </div>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectRatio === '16:9'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Landscape 16:9</span>
              <span className="sm:hidden">16:9</span>
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectRatio === '9:16'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Story/Reels 9:16</span>
              <span className="sm:hidden">9:16</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Remotion Video Player (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col items-center">
            {/* Player Container */}
            <div
              className={`relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-black flex items-center justify-center transition-all duration-300 ${
                isPortrait ? 'w-full max-w-[340px] aspect-[9/16]' : 'w-full aspect-[16/9]'
              }`}
            >
              <Player
                ref={playerRef}
                component={ShowcaseComposition}
                inputProps={{
                  aspectRatio,
                  companyName,
                  assistantName,
                }}
                durationInFrames={TOTAL_DURATION_FRAMES}
                fps={VIDEO_FPS}
                compositionWidth={compWidth}
                compositionHeight={compHeight}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls
                autoPlay={false}
                loop
                acknowledgeRemotionLicense
              />
            </div>

            {/* Quick Player Helpers */}
            <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-400 px-2">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Durasi: 54 Detik (1620 Frames @ 30fps)
              </span>
              <button
                onClick={() => jumpToScene(0)}
                className="flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Ulang dari Awal
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Scene Director & Settings (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Scene Navigator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-indigo-400" />
              Navigasi Scene Video
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Klik salah satu scene di bawah untuk melompat langsung ke segmen animasi terkait:
            </p>

            <div className="space-y-2">
              {scenes.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => jumpToScene(s.frame)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-indigo-950/60 border border-slate-700/80 hover:border-indigo-500/50 text-left transition-all group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-slate-400">{s.desc}</div>
                  </div>
                  <Play className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Customizer Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-400" />
              Kustomisasi Teks & Branding
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nama Asisten di Video:
              </label>
              <input
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nama Perusahaan:
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300 leading-relaxed">
              💡 <b>Tips Remotion:</b> Animasi di-render langsung secara programatik menggunakan kode React asli. Teks yang Anda ubah di atas akan seketika tercermin pada animasi video secara *live reload*!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
