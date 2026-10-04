import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

// Browsers download via an <a download> link, but that does nothing inside the
// Android/iOS app. There we write the file to the app cache and open the system
// share sheet so the user can save it to Files, Drive, email it, etc.
export const saveFile = async (filename: string, content: string | Blob, mimeType: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { uri } = typeof content === 'string'
    ? await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
    : await Filesystem.writeFile({ path: filename, data: await blobToBase64(content), directory: Directory.Cache });

  try {
    await Share.share({ title: filename, files: [uri] });
  } catch (e) {
    // Closing the share sheet without picking a target rejects; that's not an error.
    if (!String(e).toLowerCase().includes('cancel')) throw e;
  }
};
