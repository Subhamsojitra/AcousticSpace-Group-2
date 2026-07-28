import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, Trash2, Loader2 } from 'lucide-react';
import { formatFileSize } from '../utils/fileValidation';

function AudioUpload({
  file = null,
  handleFileChange = () => {},
  removeFile = () => {},
  uploading = false,
  fileId = null,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (uploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (uploading) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    if (uploading) return;
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleRemoveClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    removeFile();
  };

  // Extract extension safely for preview card
  const getFileExtension = (filename) => {
    if (!filename) return '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).toUpperCase() : '';
  };

  return (
    <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
      {/* Portal Header */}
      <div className="p-6 border-b border-cyber-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UploadCloud className="text-text-secondary" size={16} />
          <h2 className="font-display font-semibold text-xs tracking-wide uppercase text-text-primary">
            Audio Upload Portal
          </h2>
        </div>
        <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">
          File Vault Gateway
        </span>
      </div>

      <div className="p-8 space-y-6">


        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept=".wav,.mp3,.flac"
          disabled={uploading}
          className="hidden"
        />

        {/* Conditionally render Empty State (Dropzone) vs. Preview Card */}
        {!file ? (
          /* Empty / Drag & Drop State with complete keyboard accessibility */
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            onKeyDown={(e) => {
              if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleBrowseClick();
              }
            }}
            role="button"
            tabIndex={uploading ? -1 : 0}
            aria-label="Upload audio file"
            className={`border border-dashed rounded-2xl py-8 px-6 flex flex-col items-center justify-center text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black ${
              uploading 
                ? 'cursor-not-allowed border-cyber-border bg-white/[0.01] opacity-60'
                : isDragging
                  ? 'border-cyber-cyan bg-white/5 scale-[1.005] cursor-pointer'
                  : 'border-cyber-border bg-white/[0.01] hover:border-cyber-border/40 hover:bg-white/[0.02] cursor-pointer'
            }`}
          >
            <div className={`p-3.5 rounded-full border mb-4 transition-all duration-300 ${
              isDragging
                ? 'bg-[#0071e3] text-white border-transparent'
                : 'bg-white/5 text-text-secondary border-cyber-border'
            }`}>
              <UploadCloud size={24} className={isDragging ? 'animate-bounce' : ''} />
            </div>
            
            <h3 className="font-display font-semibold text-text-primary text-sm">
              {isDragging ? 'Drop file here to upload' : 'Drag and drop audio file here'}
            </h3>
            
            <p className="text-xs text-text-secondary mt-1 max-w-xs font-mono">
              or <span className={`text-cyber-cyan underline ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:text-cyber-cyan/90 cursor-pointer'}`}>browse your local filesystem</span>
            </p>

            <div className="mt-4 flex items-center gap-2 text-[9px] text-text-secondary font-mono border border-cyber-border bg-white/5 px-2.5 py-1.5 rounded-lg">
              <span>WAV, MP3, FLAC formats</span>
              <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
              <span>Max 15MB</span>
            </div>
          </div>
        ) : (
          /* High-Fidelity Preview Card */
          <div className={`border bg-white/[0.01] rounded-2xl p-6 animate-fadeIn space-y-4 transition-all duration-300 ${
            uploading 
              ? 'border-cyber-cyan/20 glow-shadow-cyan' 
              : 'border-cyber-border shadow-sm'
          }`}>
            <div className="flex items-center gap-4">
              {/* Decorative Audio Icon Badge */}
              <div className={`p-3 border rounded-xl transition-all ${
                uploading 
                  ? 'bg-white/5 text-cyber-cyan border-cyber-border animate-pulse' 
                  : 'bg-white/5 text-text-primary border-cyber-border'
              }`}>
                {uploading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <FileAudio size={24} className="animate-pulse" />
                )}
              </div>
              
              {/* General Metadata Info */}
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-text-primary text-sm truncate" title={file.name}>
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/5 text-text-secondary border border-cyber-border">
                    {getFileExtension(file.name) || 'AUDIO'}
                  </span>
                  <span className="text-[11px] font-mono text-text-secondary">
                    {formatFileSize(file.size)}
                  </span>
                  {uploading && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/5 text-cyber-cyan border border-cyber-cyan/10 animate-pulse">
                      PROCESSING...
                    </span>
                  )}
                  {fileId && !uploading && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/5 text-cyber-green border border-cyber-green/10">
                      SECURED
                    </span>
                  )}
                </div>
              </div>

              {/* Remove/Cancel File Button */}
              <button
                type="button"
                onClick={handleRemoveClick}
                disabled={uploading}
                className={`p-2 px-3 rounded-lg border flex items-center gap-1.5 font-mono text-[10px] font-semibold shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyber-rose/50 ${
                  uploading
                    ? 'border-cyber-border bg-white/5 text-text-secondary cursor-not-allowed opacity-40 shadow-none'
                    : 'border-cyber-border bg-white/5 text-text-primary hover:bg-white/10 cursor-pointer shadow-none'
                }`}
                title="Remove File"
              >
                <Trash2 size={12} />
                <span>REMOVE</span>
              </button>
            </div>

            {/* Technical Detail Grid */}
            <div className="pt-4 border-t border-cyber-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono">
              <div className="space-y-1">
                <span className="text-text-secondary uppercase tracking-wider block text-[8px]">MIME Type</span>
                <span className="text-text-primary block truncate">{file.type || 'audio/unknown'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-text-secondary uppercase tracking-wider block text-[8px]">
                  {fileId ? 'Server File ID' : 'Local Path Reference'}
                </span>
                <span className="text-text-primary block truncate" title={fileId || `blob:acousticspace/${file.name.replace(/\s+/g, '-')}`}>
                  {fileId || `blob:acousticspace/${file.name.replace(/\s+/g, '-')}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AudioUpload);

