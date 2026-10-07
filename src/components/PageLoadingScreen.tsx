'use client';

import React from 'react';
import Image from 'next/image';

interface PageLoadingScreenProps {
  message?: string;
}

export default function PageLoadingScreen({
  message = 'Si PALI sedang memuat...',
}: PageLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex flex-col items-center justify-center text-center px-4">
        {/* Animated Mascot GIF */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center mb-1">
          <Image
            src="/mascot/load-animated-2.gif"
            alt="Sedang memuat..."
            width={180}
            height={180}
            unoptimized
            priority
            className="object-contain"
          />
        </div>

        {/* Simple Loading Text */}
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium text-sm sm:text-base">
          <span>{message}</span>
          <span className="flex gap-1 items-center ml-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></span>
          </span>
        </div>
      </div>
    </div>
  );
}
