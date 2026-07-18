import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { formatFileSize } from '../utils/fileValidation';

export default function AudioUpload({
  file = null,
  error = null,
  handleFileChange = () => {},
  removeFile = () => {},
  uploading = false,
  fileId = null,
  handleRetry = null,
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

  // Extract extension safely for preview card
  const getFileExtension = (filename) => {
    if (!filename) return '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).toUpperCase() : '';
  };

  return (
    <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden transition-all duration-300">
      {/* Portal Header */}
      <div className="p-6 border-b border-cyber-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UploadCloud className="text-cyber-cyan" size={18} />
          <h2 className="font-display font-semibold text-slate-200">
            Audio Upload Portal
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          File Vault Gateway
        </span>
      </div>

      <div className="p-8 space-y-6">
        {/* Error State Banner */}
        {error && (
          <div className="flex items-start justify-between gap-3 p-4 bg-cyber-rose-glow border border-cyber-rose/30 rounded-lg text-slate-200 animate-fadeIn glow-shadow-rose">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-cyber-rose shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-cyber-rose uppercase tracking-wide">
                  Security Scan Warning
                </h4>
                <p className="text-xs text-slate-300">
                  {error}
                </p>
              </div>
            </div>
            {file && !uploading && handleRetry && (
              <button
                type="button"
                onClick={handleRetry}
                className="px-2.5 py-1 rounded bg-cyber-rose/20 hover:bg-cyber-rose/30 text-cyber-rose border border-cyber-rose/30 hover:border-cyber-rose/50 font-mono text-xs font-bold transition-all cursor-pointer self-center shrink-0 uppercase tracking-wider"
              >
                Retry
              </button>
            )}
          </div>
        )}

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
          /* Empty / Drag & Drop State */
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`border border-dashed rounded-xl py-8 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-cyber-cyan bg-cyber-cyan-glow/20 scale-[1.01] glow-shadow-cyan'
                : 'border-slate-700/60 bg-slate-950/30 hover:border-cyber-cyan/40 hover:bg-slate-950/50'
            }`}
          >
            <div className={`p-4 rounded-full border mb-4 transition-all duration-300 ${
              isDragging
                ? 'bg-cyber-cyan text-cyber-black border-cyber-cyan shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-cyber-cyan-glow text-cyber-cyan border-cyber-cyan/10'
            }`}>
              <UploadCloud size={32} className={isDragging ? 'animate-bounce' : ''} />
            </div>
            
            <h3 className="font-display font-semibold text-slate-200 text-sm">
              {isDragging ? 'Drop file here to upload' : 'Drag and drop audio file here'}
            </h3>
            
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
              or <span className="text-cyber-cyan underline hover:text-cyber-cyan/80">browse your local filesystem</span>
            </p>

            <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono border border-cyber-border bg-slate-950/80 px-2.5 py-1.5 rounded">
              <span>WAV, MP3, FLAC formats</span>
              <span className="w-1 h-1 rounded-full bg-slate-800"></span>
              <span>Max 15MB</span>
            </div>
          </div>
        ) : (
          /* High-Fidelity Preview Card */
          <div className={`border bg-slate-950/40 rounded-xl p-6 glow-shadow-green animate-fadeIn space-y-4 transition-all duration-300 ${
            uploading 
              ? 'border-cyber-cyan/30 glow-shadow-cyan' 
              : 'border-cyber-green/20'
          }`}>
            <div className="flex items-center gap-4">
              {/* Decorative Audio Icon Badge */}
              <div className={`p-3 border rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all ${
                uploading 
                  ? 'bg-cyber-cyan-glow text-cyber-cyan border-cyber-cyan/20 animate-pulse' 
                  : 'bg-cyber-green-glow text-cyber-green border-cyber-green/20'
              }`}>
                {uploading ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <FileAudio size={28} className="animate-pulse" />
                )}
              </div>
              
              {/* General Metadata Info */}
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-slate-200 text-sm truncate" title={file.name}>
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyber-green-glow text-cyber-green border border-cyber-green/20">
                    {getFileExtension(file.name) || 'AUDIO'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatFileSize(file.size)}
                  </span>
                  {uploading && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyber-cyan-glow text-cyber-cyan border border-cyber-cyan/20 animate-pulse">
                      PROCESSING...
                    </span>
                  )}
                  {fileId && !uploading && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyber-green-glow text-cyber-green border border-cyber-green/20">
                      SECURED
                    </span>
                  )}
                </div>
              </div>

              {/* Remove/Cancel File Button */}
              <button
                type="button"
                onClick={removeFile}
                className="p-2 px-3 rounded-lg border border-cyber-rose/30 bg-cyber-rose-glow/20 text-cyber-rose hover:bg-cyber-rose hover:text-slate-100 transition-all duration-200 cursor-pointer flex items-center gap-1.5 font-mono text-xs font-bold shrink-0"
                title={uploading ? "Cancel Scan & Remove File" : "Remove File"}
              >
                <Trash2 size={14} />
                {uploading ? <span>CANCEL</span> : <span>REMOVE</span>}
              </button>
            </div>

            {/* Technical Detail Grid */}
            <div className="pt-4 border-t border-cyber-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] font-mono">
              <div className="space-y-1">
                <span className="text-slate-500 uppercase tracking-wider block text-[9px]">MIME Type</span>
                <span className="text-slate-300 block truncate">{file.type || 'audio/unknown'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 uppercase tracking-wider block text-[9px]">
                  {fileId ? 'Server File ID' : 'Local Path Reference'}
                </span>
                <span className="text-slate-300 block truncate" title={fileId || `blob:acousticspace/${file.name.replace(/\s+/g, '-')}`}>
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
