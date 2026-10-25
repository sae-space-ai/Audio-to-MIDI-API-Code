import { useCallback, useState, useRef } from 'react';
import { Upload, X, FileAudio } from 'lucide-react';

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function FileUpload({ file, onFileChange, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      onFileChange(droppedFile);
    } else if (droppedFile) {
      // Accept any file - let the API handle validation
      onFileChange(droppedFile);
    }
  }, [disabled, onFileChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  }, [onFileChange]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (file) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <FileAudio className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatSize(file.size)} • {file.type || 'audio file'}
            </p>
          </div>
          {!disabled && (
            <button
              onClick={() => onFileChange(null)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-colors group"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
        isDragging
          ? 'border-indigo-400 bg-indigo-500/10'
          : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/[0.07]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.wma"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
          isDragging ? 'bg-indigo-500/30' : 'bg-white/5'
        }`}>
          <Upload className={`w-7 h-7 ${isDragging ? 'text-indigo-300' : 'text-gray-400'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">
            {isDragging ? 'Drop your audio file here' : 'Drag & drop your audio file'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            or click to browse • WAV, MP3, FLAC, OGG, M4A
          </p>
        </div>
      </div>
    </div>
  );
}
