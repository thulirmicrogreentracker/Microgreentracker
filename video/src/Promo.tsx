import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadTamil } from '@remotion/google-fonts/NotoSansTamil';
import { Lang, playLine, SceneTiming, scenesFor } from './timing';

const inter = loadInter('normal', { weights: ['500', '700', '800'], subsets: ['latin'] });
const tamil = loadTamil('normal', { weights: ['500', '700', '800'], subsets: ['tamil', 'latin'] });

export type Layout = 'vertical' | 'landscape';
// A type alias, not an interface: Remotion needs props that fit Record<string, unknown>.
export type PromoProps = {
  lang: Lang;
  layout: Layout;
};

const GREEN_TOP = '#10b981';
const GREEN_BOTTOM = '#065f46';
const SUPPORT = 'thulirmicrogreentracker@gmail.com';
// The app recordings are 1080 × 2400.
const CLIP_RATIO = 1080 / 2400;

const fontFor = (lang: Lang) => (lang === 'ta' ? `${tamil.fontFamily}, ${inter.fontFamily}` : inter.fontFamily);

// Fades and slides an element in at the start of its scene and fades it out at the end.
const useEnter = (frames: number, delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 18 });
  const exit = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { opacity: Math.min(enter, exit), shift: (1 - enter) * 40 };
};

const Phone: React.FC<{ clip: string; speed: number; height: number; frames: number }> = ({ clip, speed, height, frames }) => {
  const { opacity, shift } = useEnter(frames, 4);
  const width = height * CLIP_RATIO;
  const bezel = Math.round(height / 85);
  return (
    <div
      style={{
        width: width + bezel * 2,
        height: height + bezel * 2,
        padding: bezel,
        borderRadius: height / 17,
        background: '#0b1f17',
        boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
        opacity,
        transform: `translateY(${shift}px)`,
      }}
    >
      <div style={{ width, height, borderRadius: height / 20, overflow: 'hidden', background: '#f8faf5' }}>
        <OffthreadVideo src={staticFile(`clips/${clip}.mp4`)} playbackRate={speed} muted style={{ width, height }} />
      </div>
    </div>
  );
};

// The app's name is the same in every language, so it is always in Latin letters.
const Brand: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.45, color: 'white', fontFamily: fontFor('en') }}>
    <Img src={staticFile('logo.png')} style={{ width: size, height: size, borderRadius: size * 0.24 }} />
    <span style={{ fontSize: size * 0.42, fontWeight: 700, opacity: 0.95 }}>Thulir MicroGreen Tracker</span>
  </div>
);

// One feature: a title, the app clip in a phone frame and the narration as a caption.
const FeatureScene: React.FC<{ scene: SceneTiming; lang: Lang; layout: Layout }> = ({ scene, lang, layout }) => {
  const title = useEnter(scene.frames);
  const caption = useEnter(scene.frames, 8);
  const font = fontFor(lang);
  const tamilScale = lang === 'ta' ? 0.86 : 1;

  if (layout === 'vertical') {
    return (
      <AbsoluteFill style={{ alignItems: 'center', fontFamily: font }}>
        <div style={{ position: 'absolute', top: 70 }}>
          <Brand size={64} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 180,
            width: 960,
            textAlign: 'center',
            color: 'white',
            fontSize: 74 * tamilScale,
            fontWeight: 800,
            lineHeight: 1.2,
            opacity: title.opacity,
            transform: `translateY(${title.shift}px)`,
          }}
        >
          {scene.title}
        </div>
        <div style={{ position: 'absolute', top: 400 }}>
          <Phone clip={scene.clip!} speed={scene.speed} height={1100} frames={scene.frames} />
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            width: 960,
            padding: '26px 34px',
            borderRadius: 32,
            background: 'rgba(3, 40, 28, 0.55)',
            color: 'white',
            fontSize: 42 * tamilScale,
            fontWeight: 500,
            lineHeight: 1.4,
            textAlign: 'center',
            opacity: caption.opacity,
            transform: `translateY(${caption.shift}px)`,
          }}
        >
          {scene.say}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ fontFamily: font }}>
      <div style={{ position: 'absolute', top: 70, left: 140 }}>
        <Brand size={60} />
      </div>
      <div style={{ position: 'absolute', left: 140, top: 0, bottom: 0, width: 980, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 44 }}>
        <div style={{ color: 'white', fontSize: 84 * tamilScale, fontWeight: 800, lineHeight: 1.15, opacity: title.opacity, transform: `translateY(${title.shift}px)` }}>
          {scene.title}
        </div>
        <div style={{ color: '#d1fae5', fontSize: 46 * tamilScale, fontWeight: 500, lineHeight: 1.45, opacity: caption.opacity, transform: `translateY(${caption.shift}px)` }}>
          {scene.say}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 200, top: 50 }}>
        <Phone clip={scene.clip!} speed={scene.speed} height={950} frames={scene.frames} />
      </div>
    </AbsoluteFill>
  );
};

// The opening and closing cards: the logo, the name and a line of text.
const CardScene: React.FC<{ scene: SceneTiming; lang: Lang; layout: Layout; outro: boolean }> = ({ scene, lang, layout, outro }) => {
  const logo = useEnter(scene.frames);
  const text = useEnter(scene.frames, 10);
  const font = fontFor(lang);
  const big = layout === 'vertical' ? 1 : 0.9;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: font, textAlign: 'center', color: 'white' }}>
      <Img
        src={staticFile('logo.png')}
        style={{ width: 260 * big, height: 260 * big, borderRadius: 60 * big, boxShadow: '0 30px 60px rgba(0,0,0,0.3)', opacity: logo.opacity, transform: `scale(${0.9 + logo.opacity * 0.1})` }}
      />
      <div style={{ marginTop: 56, opacity: text.opacity, transform: `translateY(${text.shift}px)` }}>
        <div style={{ fontFamily: fontFor('en'), fontSize: 92 * big, fontWeight: 800, lineHeight: 1.1 }}>Thulir</div>
        <div style={{ fontFamily: fontFor('en'), fontSize: 64 * big, fontWeight: 700, lineHeight: 1.2 }}>MicroGreen Tracker</div>
        <div style={{ marginTop: 40, maxWidth: layout === 'vertical' ? 900 : 1300, fontSize: (lang === 'ta' ? 40 : 46) * big, fontWeight: 500, lineHeight: 1.45, color: '#d1fae5' }}>
          {outro ? playLine(lang) : scene.say}
        </div>
        {outro && <div style={{ marginTop: 36, fontFamily: fontFor('en'), fontSize: 34 * big, fontWeight: 500, color: '#a7f3d0' }}>{SUPPORT}</div>}
      </div>
    </AbsoluteFill>
  );
};

export const Promo: React.FC<PromoProps> = ({ lang, layout }) => {
  const scenes = scenesFor(lang);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${GREEN_TOP}, ${GREEN_BOTTOM})` }}>
      {scenes.map((scene, i) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.frames} name={scene.id}>
          {scene.clip ? (
            <FeatureScene scene={scene} lang={lang} layout={layout} />
          ) : (
            <CardScene scene={scene} lang={lang} layout={layout} outro={i === scenes.length - 1} />
          )}
          <Sequence from={6}>
            <Audio src={staticFile(`voice/${lang}-${scene.id}.mp3`)} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
