import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { photoSrc, PhotoSize } from '../../storage/photos';

const usePhotoSrc = (name: string, size: PhotoSize) => {
  const [state, setState] = useState<{ key: string; src: string | null; failed: boolean }>({ key: '', src: null, failed: false });
  const key = `${size}:${name}`;

  useEffect(() => {
    let alive = true;
    photoSrc(name, size).then(
      src => alive && setState({ key, src, failed: false }),
      () => alive && setState({ key, src: null, failed: true })
    );
    return () => { alive = false; };
  }, [key, name, size]);

  return state.key === key ? state : { src: null, failed: false };
};

interface PhotoImageProps {
  name: string;
  size: PhotoSize;
  alt: string;
  className?: string;
  contain?: boolean;
}

// Shows a stored photo, a grey box while it loads, and an icon if the file is missing on this device.
const PhotoImage: React.FC<PhotoImageProps> = ({ name, size, alt, className = '', contain = false }) => {
  const { src, failed } = usePhotoSrc(name, size);
  return (
    <div className={`relative overflow-hidden ${contain ? '' : 'bg-gray-200'} ${className}`}>
      {src && (
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`w-full h-full select-none ${contain ? 'object-contain' : 'object-cover'}`}
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400 text-[10px]">
          <ImageOff className="w-5 h-5" />
          <span>Missing</span>
        </div>
      )}
    </div>
  );
};

export default PhotoImage;
