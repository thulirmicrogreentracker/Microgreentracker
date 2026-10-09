# Makes the narration: one MP3 per scene and language in public/voice/, from script.json, with the free Microsoft
# neural voices (edge-tts). Run: .venv/bin/python make-voice.py
# To use another text-to-speech service, replace speak(); the rest of the video only needs the MP3 files.
import asyncio, json, pathlib
import edge_tts

ROOT = pathlib.Path(__file__).parent
script = json.loads((ROOT / 'script.json').read_text())
out = ROOT / 'public' / 'voice'
out.mkdir(parents=True, exist_ok=True)


async def speak(text: str, voice: str, path: pathlib.Path):
    # A little slower than the default, so captions are easy to follow.
    await edge_tts.Communicate(text, voice, rate='-5%').save(str(path))


async def main():
    for lang, voice in script['voices'].items():
        for scene in script['scenes']:
            path = out / f"{lang}-{scene['id']}.mp3"
            await speak(scene['say'][lang], voice, path)
            print(path.name)


asyncio.run(main())
