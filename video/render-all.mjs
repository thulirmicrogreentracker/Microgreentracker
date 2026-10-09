// Renders the four videos into out/: npm run render
import { execFileSync } from 'node:child_process';

for (const lang of ['en', 'ta']) {
  for (const layout of ['vertical', 'landscape']) {
    const id = `promo-${lang}-${layout}`;
    console.log(`Rendering ${id}…`);
    execFileSync('npx', ['remotion', 'render', 'src/index.ts', id, `out/thulir-${lang}-${layout}.mp4`, '--codec=h264', '--crf=18', '--log=error'], {
      stdio: 'inherit',
    });
  }
}
