# Writes src/durations.json: the length in seconds of every clip and voice file, which sets each scene's length.
# Run after recording clips or making the voice: .venv/bin/python measure.py
import json, pathlib, subprocess
ROOT = pathlib.Path(__file__).parent
F = ROOT / 'node_modules/@remotion/compositor-darwin-arm64'

def length(path):
    out = subprocess.run([str(F / 'ffprobe'), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True, env={'DYLD_LIBRARY_PATH': str(F)}, check=True)
    return round(float(out.stdout.strip()), 3)

result = {
    'clips': {p.stem: length(p) for p in sorted((ROOT / 'public/clips').glob('*.mp4'))},
    'voice': {p.stem: length(p) for p in sorted((ROOT / 'public/voice').glob('*.mp3'))},
}
(ROOT / 'src/durations.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
