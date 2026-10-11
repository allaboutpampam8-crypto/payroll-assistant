import React from 'react';
import { Sequence } from 'remotion';
import { VideoShowcaseProps } from './types';
import { Scene1Intro } from './scenes/Scene1Intro';
import { Scene2Problem } from './scenes/Scene2Problem';
import { Scene3FeaturesMacro } from './scenes/Scene3FeaturesMacro';
import { Scene4LaporReminder } from './scenes/Scene4LaporReminder';
import { Scene5TelegramAI } from './scenes/Scene5TelegramAI';
import { Scene6Outro } from './scenes/Scene6Outro';

export const ShowcaseComposition: React.FC<VideoShowcaseProps> = ({
  aspectRatio = '16:9',
  companyName = 'PT Pelindo Daya Sejahtera',
  assistantName = 'Asisten Payroll PDS',
}) => {
  return (
    <div className="relative w-full h-full bg-slate-950 font-sans">
      {/* Scene 1: Intro Hook & Branding (0s - 8.3s = 250 frames) */}
      <Sequence from={0} durationInFrames={250} name="Intro & Branding">
        <Scene1Intro
          aspectRatio={aspectRatio}
          companyName={companyName}
          assistantName={assistantName}
        />
      </Sequence>

      {/* Scene 2: Tantangan & Problem Solving (8.3s - 17.3s = 270 frames) */}
      <Sequence from={250} durationInFrames={270} name="Tantangan Penggajian">
        <Scene2Problem aspectRatio={aspectRatio} />
      </Sequence>

      {/* Scene 3: Makro Komparasi & Master Excel (17.3s - 27.3s = 300 frames) */}
      <Sequence from={520} durationInFrames={300} name="Komparasi & Master Excel">
        <Scene3FeaturesMacro aspectRatio={aspectRatio} />
      </Sequence>

      {/* Scene 4: Lapor Kendala & Overdue Reminder (27.3s - 37.3s = 300 frames) */}
      <Sequence from={820} durationInFrames={300} name="Lapor & Overdue Reminder">
        <Scene4LaporReminder aspectRatio={aspectRatio} />
      </Sequence>

      {/* Scene 5: Bot Telegram & AI Chat (37.3s - 47.3s = 300 frames) */}
      <Sequence from={1120} durationInFrames={300} name="Telegram & AI Assistant">
        <Scene5TelegramAI aspectRatio={aspectRatio} />
      </Sequence>

      {/* Scene 6: Outro & Call to Action (47.3s - 54s = 200 frames) */}
      <Sequence from={1420} durationInFrames={200} name="Outro & Penutup">
        <Scene6Outro
          aspectRatio={aspectRatio}
          companyName={companyName}
          assistantName={assistantName}
        />
      </Sequence>
    </div>
  );
};
