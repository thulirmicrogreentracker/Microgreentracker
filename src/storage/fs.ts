import { Directory, Encoding, FileInfo, Filesystem } from '@capacitor/filesystem';

// Everything the app stores lives under one folder in the app's private storage:
// Android internal files, iOS Documents (included in the iCloud device backup),
// and IndexedDB when running in a browser.
export const DIRECTORY = Directory.Data;
export const ROOT = 'microgreen';

export const readText = async (path: string): Promise<string | null> => {
  try {
    const { data } = await Filesystem.readFile({ path, directory: DIRECTORY, encoding: Encoding.UTF8 });
    return typeof data === 'string' ? data : await data.text();
  } catch {
    return null; // missing file
  }
};

export const writeText = async (path: string, text: string): Promise<void> => {
  await Filesystem.writeFile({ path, data: text, directory: DIRECTORY, encoding: Encoding.UTF8, recursive: true });
};

export const readBase64 = async (path: string): Promise<string> => {
  const { data } = await Filesystem.readFile({ path, directory: DIRECTORY });
  if (typeof data !== 'string') throw new Error(`Unexpected binary read for ${path}`);
  return data;
};

export const writeBase64 = async (path: string, base64: string): Promise<void> => {
  await Filesystem.writeFile({ path, data: base64, directory: DIRECTORY, recursive: true });
};

export const listFiles = async (path: string): Promise<FileInfo[]> => {
  try {
    const { files } = await Filesystem.readdir({ path, directory: DIRECTORY });
    return files.filter(f => f.type === 'file');
  } catch {
    return []; // folder not created yet
  }
};

export const deleteFile = async (path: string): Promise<void> => {
  await Filesystem.deleteFile({ path, directory: DIRECTORY });
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
