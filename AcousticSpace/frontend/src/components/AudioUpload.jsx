import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, Trash2, Loader2, Play } from 'lucide-react';
import { formatFileSize } from '../utils/fileValidation';

function AudioUpload({
  file = null,
  handleFileChange = () => {},
  removeFile = () => {},
  uploading = false,
  fileId = null,
  onAnalyze = () => {},
  stage = 'idle',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (uploading) {
      e.dataTransfer.dropEffect = 'none';
    }
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
    if (uploading) return;
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
    <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover-lift animate-fadeIn">
      {/* Portal Header */}
      <div className="p-6 border-b border-cyber-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UploadCloud className="text-text-secondary" size={15} />
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
            className={`border border-dashed rounded-2xl py-10 px-6 flex flex-col items-center justify-center text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black ${
              uploading 
                ? 'cursor-not-allowed border-cyber-border/40 bg-white/[0.01] opacity-60'
                : isDragging
                  ? 'border-cyber-cyan bg-cyber-cyan/5 scale-[1.005] cursor-pointer shadow-inner'
                  : 'border-cyber-border/80 bg-white/[0.01] hover:border-cyber-cyan/45 hover:bg-white/[0.02] cursor-pointer'
            }`}
          >
            <div className={`p-4 rounded-full border mb-4 transition-all duration-300 ${
              isDragging
                ? 'bg-[#0071e3] text-white border-transparent shadow-sm'
                : 'bg-white/5 text-text-secondary border-cyber-border/60'
            }`}>
              <UploadCloud size={24} className={isDragging ? 'animate-bounce' : ''} />
            </div>
            
            <h3 className="font-display font-semibold text-text-primary text-sm tracking-tight">
              {isDragging ? 'Drop file here to upload' : 'Drag and drop audio file here'}
            </h3>
            
            <p className="text-xs text-text-secondary mt-1 max-w-xs font-mono">
              or <span className={`text-cyber-cyan underline ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:text-cyber-cyan/90 cursor-pointer'}`}>browse your local filesystem</span>
            </p>

            <div className="mt-5 flex items-center gap-2 text-[9px] text-text-secondary font-mono border border-cyber-border/40 bg-white/5 px-3 py-1.5 rounded-lg shadow-sm">
              <span>WAV, MP3, FLAC formats</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span>Max 15MB</span>
            </div>
          </div>
        ) : (
          /* High-Fidelity Preview Card */
          <div className={`border bg-white/[0.01] rounded-2xl p-6 animate-fadeIn space-y-4 transition-all duration-300 ${
            uploading 
              ? 'border-cyber-cyan/20 glow-shadow-cyan' 
              : 'border-cyber-border/80 shadow-sm'
          }`}>
            <div className="flex items-center gap-4">
              {/* Decorative Audio Icon Badge */}
              <div className={`p-3 border rounded-xl transition-all ${
                uploading 
                  ? 'bg-white/5 text-cyber-cyan border-cyber-cyan/20 animate-pulse' 
                  : 'bg-white/5 text-text-primary border-cyber-border/60'
              }`}>
                {uploading ? (
                  <Loader2 size={24} className="animate-spin text-cyber-cyan" />
                ) : (
                  <FileAudio size={24} className="text-cyber-cyan animate-pulse" />
                )}
              </div>
              
              {/* General Metadata Info */}
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-text-primary text-sm truncate tracking-tight" title={file.name}>
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/5 text-text-secondary border border-cyber-border/40">
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
                className={`p-2 px-3 rounded-lg border flex items-center gap-1.5 font-mono text-[10px] font-semibold shrink-0 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyber-rose/50 ${
                  uploading
                    ? 'border-cyber-border/40 bg-white/5 text-text-secondary cursor-not-allowed opacity-40 shadow-none'
                    : 'border-cyber-border/60 bg-white/5 text-text-primary hover:bg-cyber-rose/10 hover:text-cyber-rose hover:border-cyber-rose/20 cursor-pointer shadow-none'
                }`}
                title="Remove File"
              >
                <Trash2 size={11} />
                <span>REMOVE</span>
              </button>
            </div>

            {/* Technical Detail Grid */}
            <div className="pt-4 border-t border-cyber-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono">
              <div className="space-y-1">
                <span className="text-text-secondary uppercase tracking-wider block text-[8px]">MIME Type</span>
                <span className="text-text-primary block truncate font-medium">{file.type || 'audio/unknown'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-text-secondary uppercase tracking-wider block text-[8px]">
                  {fileId ? 'Server File ID' : 'Local Path Reference'}
                </span>
                <span className="text-text-primary block truncate font-medium" title={fileId || `blob:acousticspace/${file.name.replace(/\s+/g, '-')}`}>
                  {fileId || `blob:acousticspace/${file.name.replace(/\s+/g, '-')}`}
                </span>
              </div>
            </div>

            {/* Primary Analyze Action Button */}
            <div className="pt-4 border-t border-cyber-border/40 flex flex-col gap-2">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={uploading || stage === 'completed'}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold rounded-xl transition-all duration-300 text-xs tracking-wide cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black active:scale-[0.98] ${
                  uploading
                    ? 'bg-white/5 text-text-secondary border border-cyber-border/40 cursor-not-allowed shadow-none'
                    : stage === 'completed'
                      ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20 cursor-not-allowed shadow-none font-bold'
                      : 'bg-[#0071e3] text-white hover:bg-[#0077ed] hover:shadow-md hover:shadow-blue-500/10 shadow-sm border border-transparent'
                }`}
              >
                {stage === 'completed' ? (
                  <span>Forensic Analysis Complete</span>
                ) : (
                  <>
                    <Play size={12} fill="currentColor" />
                    <span>Analyze Audio Payload</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AudioUpload);

