import script from '../script.json';
import durations from './durations.json';

export type Lang = 'en' | 'ta';
export const FPS = 30;

// Each scene lasts as long as its narration plus a short pause, and long enough that its app clip plays at no more
// than MAX_SPEED times normal speed.
const PAUSE = 1.0;
const MAX_SPEED = 1.8;

export interface SceneTiming {
  id: string;
  clip: string | null;
  from: number; // first frame
  frames: number;
  speed: number; // clip playback rate
  title: string;
  say: string;
}

export const scenesFor = (lang: Lang): SceneTiming[] => {
  let from = 0;
  return script.scenes.map((scene) => {
    const voice = (durations.voice as Record<string, number>)[`${lang}-${scene.id}`];
    const clip = scene.clip ? (durations.clips as Record<string, number>)[scene.clip] : 0;
    const seconds = Math.max(voice + PAUSE, clip / MAX_SPEED);
    const frames = Math.ceil(seconds * FPS);
    const timing: SceneTiming = {
      id: scene.id,
      clip: scene.clip,
      from,
      frames,
      speed: clip ? Math.min(MAX_SPEED, clip / seconds) : 1,
      title: scene.title[lang],
      say: scene.say[lang],
    };
    from += frames;
    return timing;
  });
};

export const totalFrames = (lang: Lang) => scenesFor(lang).reduce((n, s) => n + s.frames, 0);
export const playLine = (lang: Lang) => script.playLine[lang];
