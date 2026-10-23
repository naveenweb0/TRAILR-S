import React, { useState, useRef } from 'react';
import { api } from '../../services/api.js';
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

export interface UploadedMediaItem {
  id: string; // client temporary ID
  url: string;
  publicId: string;
  caption?: string;
  isCover: boolean;
  sortOrder: number;
  fileName: string;
  sizeBytes: number;
  status: 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  file?: File;
}

interface MediaUploaderProps {
  maxImages?: number;
  minImages?: number;
  items: UploadedMediaItem[];
  onChange: (items: UploadedMediaItem[]) => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  maxImages = 6,
  minImages = 3,
  items,
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const handleFileSelection = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const availableSlots = maxImages - items.length;

    if (availableSlots <= 0) {
      alert(`You can upload a maximum of ${maxImages} images.`);
      return;
    }

    const filesToProcess = fileArray.slice(0, availableSlots);
    const newItems: UploadedMediaItem[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];

      // Format validation
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP.`);
        continue;
      }

      // Size validation
      if (file.size > maxSizeBytes) {
        alert(`File "${file.name}" exceeds the 10MB file size limit.`);
        continue;
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const isFirstImage = items.length === 0 && i === 0;

      newItems.push({
        id: tempId,
        url: URL.createObjectURL(file), // temporary preview
        publicId: '',
        caption: '',
        isCover: isFirstImage,
        sortOrder: items.length + i,
        fileName: file.name,
        sizeBytes: file.size,
        status: 'uploading',
        file,
      });
    }

    const updatedList = [...items, ...newItems];
    onChange(updatedList);

    // Upload each new file to Cloudinary via backend secure endpoint
    for (const item of newItems) {
      if (!item.file) continue;
      try {
        const uploadRes = await api.uploadImageFile(item.file, 'schooldest/proposals');
        if (uploadRes.success && uploadRes.data) {
          onChange(
            updatedList.map((cur) =>
              cur.id === item.id
                ? {
                    ...cur,
                    url: uploadRes.data.secureUrl || uploadRes.data.url,
                    publicId: uploadRes.data.publicId,
                    status: 'completed',
                  }
                : cur
            )
          );
        } else {
          throw new Error(uploadRes.message || 'Upload failed');
        }
      } catch (err: any) {
        onChange(
          updatedList.map((cur) =>
            cur.id === item.id
              ? {
                  ...cur,
                  status: 'error',
                  errorMessage: err.message || 'Upload failed',
                }
              : cur
          )
        );
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  const setCoverImage = (id: string) => {
    onChange(
      items.map((item) => ({
        ...item,
        isCover: item.id === id,
      }))
    );
  };

  const removeItem = (id: string) => {
    const remaining = items.filter((item) => item.id !== id);
    // If the removed item was the cover, assign the first remaining image as cover
    if (remaining.length > 0 && !remaining.some((item) => item.isCover)) {
      remaining[0].isCover = true;
    }
    // Re-index sortOrder
    const reindexed = remaining.map((item, idx) => ({ ...item, sortOrder: idx }));
    onChange(reindexed);
  };

  const retryUpload = async (item: UploadedMediaItem) => {
    if (!item.file) return;

    onChange(
      items.map((cur) =>
        cur.id === item.id ? { ...cur, status: 'uploading', errorMessage: undefined } : cur
      )
    );

    try {
      const uploadRes = await api.uploadImageFile(item.file, 'schooldest/proposals');
      if (uploadRes.success && uploadRes.data) {
        onChange(
          items.map((cur) =>
            cur.id === item.id
              ? {
                  ...cur,
                  url: uploadRes.data.secureUrl || uploadRes.data.url,
                  publicId: uploadRes.data.publicId,
                  status: 'completed',
                }
              : cur
          )
        );
      } else {
        throw new Error(uploadRes.message || 'Retry failed');
      }
    } catch (err: any) {
      onChange(
        items.map((cur) =>
          cur.id === item.id
            ? {
                ...cur,
                status: 'error',
                errorMessage: err.message || 'Retry failed',
              }
            : cur
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFileSelection(e.target.files);
          }}
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h4 className="text-[17px] sm:text-[18px] font-bold text-slate-900">
          Drag & Drop High-Resolution Photos Here
        </h4>
        <p className="text-[15px] text-slate-600 mt-1.5">
          Or <span className="text-blue-600 font-bold underline">browse from your computer</span>. JPEG, PNG, or WebP up to 10MB each.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-[13px] font-semibold text-slate-700">
          <span>{items.length} of {maxImages} uploaded</span>
          <span>•</span>
          <span>Minimum recommended: {minImages} photos</span>
        </div>
      </div>

      {/* Grid of Preview Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pt-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative group rounded-2xl overflow-hidden border-2 bg-slate-900 transition-all ${
                item.isCover ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="aspect-[4/3] w-full bg-slate-800 relative">
                <img
                  src={item.url}
                  alt={item.fileName}
                  className="w-full h-full object-cover"
                />

                {/* Upload Status Overlay */}
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-white">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-400 mb-2" />
                    <span className="text-[13px] font-semibold">Uploading to Cloudinary...</span>
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-white text-center">
                    <AlertCircle className="w-7 h-7 text-rose-400 mb-1" />
                    <span className="text-[13px] font-bold text-rose-200">Upload Failed</span>
                    <span className="text-[12px] text-rose-300 line-clamp-2 mt-0.5">{item.errorMessage}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        retryUpload(item);
                      }}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[12px] font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  {item.isCover && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      Cover Image
                    </span>
                  )}
                  {item.status === 'completed' && !item.isCover && (
                    <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Delete Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-md"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-2.5 flex items-center justify-between text-white">
                  <span className="text-[12px] truncate max-w-[130px] text-slate-300 font-medium">
                    {item.fileName}
                  </span>

                  {!item.isCover && item.status === 'completed' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverImage(item.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[11px] font-bold transition-colors"
                    >
                      Make Cover
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
