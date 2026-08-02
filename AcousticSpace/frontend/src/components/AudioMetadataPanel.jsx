import React, { useState, useEffect } from 'react';
import { Info, Disc, Clock, Activity, HardDrive, Cpu } from 'lucide-react';
import { formatFileSize } from '../utils/fileValidation';

function AudioMetadataPanel({ file, onMetadataLoaded }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setMeta(null);
      if (onMetadataLoaded) {
        onMetadataLoaded(null);
      }
      return;
    }

    let active = true;
    setLoading(true);

    const parseAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        
        const audioCtx = new AudioContextClass();
        const arrayBuffer = await file.arrayBuffer();
        
        try {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (active) {
            const parsedMeta = {
              duration: audioBuffer.duration,
              sampleRate: audioBuffer.sampleRate,
              channels: audioBuffer.numberOfChannels,
            };
            setMeta(parsedMeta);
            if (onMetadataLoaded) {
              onMetadataLoaded(parsedMeta);
            }
          }
        } catch (e) {
          console.warn('Audio metadata parsing failed', e);
        } finally {
          try {
            audioCtx.close();
          } catch {}
        }
      } catch (err) {
        console.error('MIME mapping metadata error', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    parseAudio();

    return () => {
      active = false;
    };
  }, [file, onMetadataLoaded]);

  if (!file) {
    return (
      <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 flex flex-col items-center justify-center text-center py-10">
        <Info size={20} className="text-text-secondary animate-pulse" />
        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mt-3">
          Metadata Panel Standby
        </p>
        <p className="text-[9px] text-text-secondary mt-1 font-mono leading-normal max-w-xs">
          Upload an audio file to inspect channels and sample specifications.
        </p>
      </div>
    );
  }

  const fileExt = file.name.substring(file.name.lastIndexOf('.') + 1).toUpperCase();

  return (
    <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 shadow-md transition-all duration-300 hover-lift animate-fadeIn">
      <div className="flex items-center gap-2 pb-4 border-b border-cyber-border/40 mb-4">
        <Cpu size={15} className="text-cyber-cyan" />
        <h3 className="font-display font-semibold text-xs tracking-wide uppercase text-text-primary">
          Audio Hardware Specifications
        </h3>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-6 space-y-2">
          <Clock size={16} className="text-cyber-cyan animate-pulse" />
          <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest animate-pulse">
            Probing File Structure...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-1">
            <span className="text-[8px] font-mono text-text-secondary uppercase tracking-wider block">File Size</span>
            <div className="flex items-center gap-1.5">
              <HardDrive size={12} className="text-text-secondary" />
              <span className="text-xs font-mono font-bold text-text-primary">{formatFileSize(file.size)}</span>
            </div>
          </div>

          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-1">
            <span className="text-[8px] font-mono text-text-secondary uppercase tracking-wider block">MIME Format</span>
            <div className="flex items-center gap-1.5">
              <Disc size={12} className="text-text-secondary" />
              <span className="text-xs font-mono font-bold text-text-primary">{fileExt || 'AUDIO'}</span>
            </div>
          </div>

          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-1">
            <span className="text-[8px] font-mono text-text-secondary uppercase tracking-wider block">Duration</span>
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-text-secondary" />
              <span className="text-xs font-mono font-bold text-text-primary">
                {meta ? `${meta.duration.toFixed(2)}s` : '—'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-1">
            <span className="text-[8px] font-mono text-text-secondary uppercase tracking-wider block">Sample Rate</span>
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-text-secondary" />
              <span className="text-xs font-mono font-bold text-text-primary">
                {meta ? `${meta.sampleRate} Hz` : '—'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl col-span-2 space-y-1">
            <span className="text-[8px] font-mono text-text-secondary uppercase tracking-wider block">Audio Channels</span>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-text-primary">
              <span className="text-text-secondary text-[10px] font-normal uppercase">Layout Structure</span>
              <span>{meta ? (meta.channels === 1 ? 'Mono (1 Ch)' : `Stereo (${meta.channels} Ch)`) : '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(AudioMetadataPanel);
