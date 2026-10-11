import React, { useRef } from 'react';

interface ImageUploadZoneProps {
  onImageUpload: (file: File) => void;
  isUploading: boolean;
}

export function ImageUploadZone({ onImageUpload, isUploading }: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="group w-full cursor-pointer rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center transition-colors hover:border-[var(--color-primary-medium)] hover:bg-[var(--color-primary-subtle)]"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-accent-text)]">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </span>
        
        <div>
          <p className="heading mb-1 text-lg">
            {isUploading ? 'Uploading...' : 'Upload X-ray Image'}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Click to browse or drag and drop
          </p>
          <p className="eyebrow mt-3">
            JPEG · PNG · BMP · TIFF · Max 20MB
          </p>
        </div>
      </div>
    </div>
  );
}