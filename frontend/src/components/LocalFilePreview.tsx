'use client';

import { useEffect, useState } from 'react';
import { fileSize } from '@/lib/format';

export function LocalFilePreview({ file }: { file: File }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!file.type.startsWith('image/')) {
      setSrc('');
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="local-file-preview">
      {src ? <img src={src} alt={`Preview of ${file.name}`} /> : <span className="local-file-icon">📎</span>}
      <span className="local-file-copy"><strong>{file.name}</strong><small>{fileSize(file.size)}</small></span>
    </div>
  );
}
