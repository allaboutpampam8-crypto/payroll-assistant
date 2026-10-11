export type VideoAspectRatio = '16:9' | '9:16';

export interface VideoShowcaseProps {
  aspectRatio: VideoAspectRatio;
  companyName?: string;
  assistantName?: string;
  primaryColor?: string;
}

export const VIDEO_FPS = 30;
// Total durasi: 54 detik = 1620 frames (30 fps)
// Scene 1: 0 - 240 (8s) Intro
// Scene 2: 240 - 510 (9s) Problem
// Scene 3: 510 - 810 (10s) Macro Payroll & Excel
// Scene 4: 810 - 1110 (10s) Lapor Kendala & Overdue Reminder
// Scene 5: 1110 - 1410 (10s) Telegram & Gemini AI Bot
// Scene 6: 1410 - 1620 (7s) Outro & Call to Action
export const TOTAL_DURATION_FRAMES = 1620;
