import { AppData } from '../types';
import { ROOT, bytesToBase64, deleteFile, listFiles, readBase64, writeBase64 } from './fs';

const PHOTOS = `${ROOT}/photos`;
const MAX_SIZE = 1600; // px, longest side
const JPEG_QUALITY = 0.8;

// Photo names come from backup files too, so only accept plain file names.
export const isSafePhotoName = (name: string): boolean => /^[A-Za-z0-9_-]+\.(jpe?g|png|webp|gif|heic)$/i.test(name);

const newPhotoName = (ext: string) =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

const compressToJpeg = async (file: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', JPEG_QUALITY)
  );
};

// Shrinks a camera/gallery image and stores it as its own file. Returns the file name to keep on the batch.
export const savePhotoFromFile = async (file: File): Promise<string> => {
  let blob: Blob = file;
  let ext = 'jpg';
  try {
    blob = await compressToJpeg(file);
  } catch {
    // The WebView couldn't decode it; keep the original bytes.
    const original = file.name.split('.').pop()?.toLowerCase();
    ext = original && isSafePhotoName(`x.${original}`) ? original : 'jpg';
  }
  const name = newPhotoName(ext);
  await writeBase64(`${PHOTOS}/${name}`, bytesToBase64(new Uint8Array(await blob.arrayBuffer())));
  return name;
};

export const savePhotoBase64 = async (name: string, base64: string): Promise<void> => {
  if (!isSafePhotoName(name)) throw new Error(`Invalid photo name: ${name}`);
  await writeBase64(`${PHOTOS}/${name}`, base64);
};

export const readPhotoBase64 = (name: string): Promise<string> => readBase64(`${PHOTOS}/${name}`);

export const photoNamesIn = (data: AppData): string[] =>
  data.batches.flatMap(b => b.photos.map(p => p.file)).filter(Boolean);

// Deletes photo files that no longer belong to any batch in the current data or a kept snapshot.
// Files written after `olderThan` are kept: they may belong to a change that isn't saved yet.
export const deleteUnusedPhotos = async (inUse: Set<string>, olderThan: number): Promise<void> => {
  const files = await listFiles(PHOTOS);
  const unused = files.filter(f => !inUse.has(f.name) && f.mtime < olderThan);
  await Promise.all(unused.map(f => deleteFile(`${PHOTOS}/${f.name}`).catch(() => {})));
};
