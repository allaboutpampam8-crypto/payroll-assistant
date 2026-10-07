'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Send,
  X,
  RotateCcw,
  Sparkles,
  Bot,
  Minimize2,
  Maximize2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiChatWidgetProps {
  onDataUpdated?: () => void;
}

const QUICK_PROMPTS = [
  {
    icon: '📋',
    label: 'Tiket OPEN',
    prompt: 'Ada berapa tiket kendala payroll yang masih OPEN saat ini?',
  },
  {
    icon: '🔄',
    label: 'Ubah ke CROSSCHECK',
    prompt: 'Tolong ubah semua tiket yang statusnya OPEN menjadi CROSSCHECK',
  },
  {
    icon: '💰',
    label: 'Cek Gaji Pegawai',
    prompt: 'Cek gaji Ahmad Maulana di periode aktif',
  },
  {
    icon: '📝',
    label: 'To-Do List',
    prompt: 'Tolong rekap agenda to-do list saya yang belum selesai',
  },
  {
    icon: '🏢',
    label: 'Total Project',
    prompt: 'Berapa total take home pay dan lembur untuk project Koja?',
  },
];

export default function AiChatWidget({ onDataUpdated }: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Jika kemungkinan ada mutasi data (misal update tiket), trigger refresh di halaman utama
        if (
          text.toLowerCase().includes('ubah') ||
          text.toLowerCase().includes('update') ||
          text.toLowerCase().includes('tutup') ||
          text.toLowerCase().includes('crosscheck') ||
          text.toLowerCase().includes('close')
        ) {
          onDataUpdated?.();
        }
      } else {
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ ${data.error || 'Maaf, terjadi kendala saat menghubungi asisten AI.'}`,
          timestamp: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err: any) {
      const netErrMsg: ChatMessage = {
        id: `net-err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Terjadi gangguan jaringan: ${err.message || 'Gagal terhubung.'}`,
        timestamp: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, netErrMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    if (confirm('Bersihkan percakapan chat AI?')) {
      setMessages([]);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white pl-2.5 pr-4 py-2 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/40 ring-4 ring-indigo-500/20"
          title="Buka Asisten AI Payroll"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/20 p-0.5 shadow-inner">
            <Image
              src="/mascot/avatar.png"
              alt="Mascot AI"
              width={40}
              height={40}
              className="object-cover rounded-full"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Tanya AI
            </div>
            <div className="text-sm font-bold text-white leading-tight">Asisten Payroll</div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[420px] h-[600px] max-h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-3.5 flex items-center justify-between shadow-md border-b border-indigo-900/50">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white/10 p-0.5 border border-sky-400/40 shadow-sm flex-shrink-0">
                <Image
                  src="/mascot/avatar.png"
                  alt="Mascot Avatar"
                  width={44}
                  height={44}
                  className="object-cover rounded-full"
                />
                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5 leading-snug">
                  Asisten Intelijen Payroll
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-1.5 py-0.2 rounded-full font-medium">
                    Gemini AI
                  </span>
                </h3>
                <p className="text-[11px] text-sky-200 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Online • Siap membantu olah data
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
                  title="Bersihkan Chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
                title="Tutup Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/80 dark:bg-slate-950/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-28 h-28 relative mb-3 drop-shadow-md">
                  <Image
                    src="/mascot/ready.png"
                    alt="Siap Membantu"
                    width={112}
                    height={112}
                    className="object-contain rounded-xl"
                  />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  Halo Pak Pampam! 👋
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Saya maskot asisten payroll Anda. Anda bisa bertanya rincian gaji, komparasi
                  selisih, tiket kendala, atau meminta update status langsung.
                </p>

                {/* Quick Prompts */}
                <div className="mt-4 w-full flex flex-col gap-1.5 text-left">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                    Pilihan Cepat:
                  </div>
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp.prompt)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 text-xs text-left transition-all shadow-xs group"
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">
                        {qp.icon}
                      </span>
                      <span className="flex-1 font-medium">{qp.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-100 dark:bg-slate-800 flex-shrink-0 mt-0.5 border border-indigo-200">
                      <Image
                        src="/mascot/avatar.png"
                        alt="AI Avatar"
                        width={28}
                        height={28}
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                    }`}
                  >
                    {msg.sender === 'assistant' ? (
                      <div
                        className="prose prose-xs dark:prose-invert max-w-none space-y-1.5 text-xs [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-4 [&>code]:bg-slate-100 dark:[&>code]:bg-slate-700 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded"
                        dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}

                    <div
                      className={`text-[9px] mt-1.5 text-right font-mono ${
                        msg.sender === 'user'
                          ? 'text-indigo-200'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Thinking / Loading Animation */}
            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-100 dark:bg-slate-800 flex-shrink-0 mt-0.5 border border-indigo-200">
                  <Image
                    src="/mascot/thinking.png"
                    alt="AI Thinking"
                    width={28}
                    height={28}
                    className="object-cover"
                  />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl rounded-tl-none p-3 shadow-xs max-w-[80%]">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-xs">
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></span>
                    </span>
                    <span>Mengecek database payroll...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700/70 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya gaji atau minta update tiket..."
                className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden py-1"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Kirim pesan"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 px-1">
              <span>Tekan Enter untuk mengirim</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> Powered by Gemini
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
