import React from 'react';
import { Composition } from 'remotion';
import { Promo } from './Promo';
import { FPS, totalFrames } from './timing';

// Four videos: English and Tamil, each vertical (Instagram Reels, YouTube Shorts) and landscape (YouTube, Play Store).
// The 6-frame offset of the narration in each scene is covered by the 1-second pause added to every scene.
export const Root: React.FC = () => (
  <>
    {(['en', 'ta'] as const).map((lang) => (
      <React.Fragment key={lang}>
        <Composition
          id={`promo-${lang}-vertical`}
          component={Promo}
          durationInFrames={totalFrames(lang)}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{ lang, layout: 'vertical' as const }}
        />
        <Composition
          id={`promo-${lang}-landscape`}
          component={Promo}
          durationInFrames={totalFrames(lang)}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ lang, layout: 'landscape' as const }}
        />
      </React.Fragment>
    ))}
  </>
);
