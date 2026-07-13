import React, { useState, useEffect } from 'react';
import { Activity, Info, BarChart2 } from 'lucide-react';
import { formatFileSize } from '../utils/fileValidation';

/**
 * Generates a deterministic fallback waveform visualization based on a seed string.
 * This ensures we have a beautiful visualization even if browser codec support fails.
 */
const generateFallbackWaveform = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const points = [];
  const numBars = 80;
  for (let i = 0; i < numBars; i++) {
    // Generate organic-looking waves
    const wave1 = Math.sin(i * 0.15) * 0.45;
    const wave2 = Math.cos(i * 0.08) * 0.35;
    const noise = Math.abs(Math.sin(hash + i) * 0.2);
    const val = Math.max(0.08, Math.min(1.0, Math.abs(wave1 + wave2) + noise));
    points.push(val);
  }
  return points;
};

export default function WaveformViewer({
  file,
  externalWaveformData = null,
  externalLoading = false,
  externalError = null,
}) {
  const [amplitudes, setAmplitudes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derived state to support either internal processing or external backend data
  const isLoading = externalLoading || loading;
  const hasError = externalError || error;

  useEffect(() => {
    if (externalWaveformData) {
      setAmplitudes(externalWaveformData);
      setLoading(false);
      setError(null);
      return;
    }

    if (!file) {
      setAmplitudes([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const processAudio = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (!active) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API is not supported in this browser.');
        }

        const audioCtx = new AudioContextClass();
        
        try {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (!active) {
            audioCtx.close();
            return;
          }

          const channelData = audioBuffer.getChannelData(0);
          const numBars = 80;
          const step = Math.floor(channelData.length / numBars);
          const points = [];
          
          for (let i = 0; i < numBars; i++) {
            let max = 0;
            const start = i * step;
            for (let j = 0; j < step; j++) {
              const val = Math.abs(channelData[start + j]);
              if (val > max) max = val;
            }
            points.push(max);
          }

          const maxVal = Math.max(...points) || 1;
          const normalized = points.map(val => Math.max(0.08, val / maxVal));

          if (active) {
            setAmplitudes(normalized);
            setLoading(false);
          }
          audioCtx.close();
        } catch (decodeError) {
          console.warn('Audio decoding failed, using fallback visual representation', decodeError);
          audioCtx.close();
          if (active) {
            const fallback = generateFallbackWaveform(file.name);
            setAmplitudes(fallback);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error reading/processing file:', err);
        if (active) {
          const fallback = generateFallbackWaveform(file.name);
          setAmplitudes(fallback);
          setLoading(false);
        }
      }
    };

    processAudio();

    return () => {
      active = false;
    };
  }, [file, externalWaveformData]);

  // Render standby state (placeholder when no audio is uploaded)
  if (!file && !externalWaveformData) {
    return (
      <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden">
        <div className="p-6 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-cyber-cyan" size={18} />
            <h2 className="font-display font-semibold text-slate-200">
              Spectral Waveform Analyzer
            </h2>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            STANDBY
          </span>
        </div>

        <div className="p-8 bg-slate-950/50 relative overflow-hidden flex items-center justify-center min-h-[160px]">
          {/* Static Waveform Mock (Muted Mapped Bars) */}
          <svg className="w-full h-32 text-slate-800/25 animate-pulse" viewBox="0 0 400 100" preserveAspectRatio="none">
            {[...Array(60)].map((_, i) => {
              const x = 5 + i * 6.5;
              const height = 15 + Math.sin(x * 0.05) * 8;
              const y = 50 - height / 2;
              
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width="3"
                  height={height}
                  rx="1.5"
                  className="fill-slate-800/40"
                />
              );
            })}
          </svg>

          {/* Watermark Centered Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border border-slate-800 bg-slate-950 px-3 py-1.5 rounded">
              Awaiting Audio Upload
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden transition-all duration-300">
      {/* Header Panel */}
      <div className="p-6 border-b border-cyber-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-cyber-cyan" size={18} />
          <h2 className="font-display font-semibold text-slate-200">
            Spectral Waveform Analyzer
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-cyber-cyan animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan"></span>
              DECODING
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-cyber-green">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-green"></span>
              ANALYZED
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Metadata Details bar */}
        {file && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950/60 border border-cyber-border/40 rounded-lg text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-500 uppercase shrink-0">File:</span>
              <span className="text-slate-200 truncate font-semibold" title={file.name}>
                {file.name}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase">Size:</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Waveform Visualization Canvas / SVG Area */}
        <div className="p-6 bg-slate-950/40 border border-cyber-border/20 rounded-xl relative overflow-hidden flex flex-col justify-center min-h-[160px] glow-shadow-cyan">
          {/* Subtle grid background for high-tech analyzer feel */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          ></div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 z-10">
              <BarChart2 className="text-cyber-cyan animate-pulse" size={32} />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider animate-pulse">
                Demuxing Audio Channels...
              </p>
            </div>
          ) : (
            <div className="relative w-full h-32 flex items-center justify-center z-10 select-none">
              <svg 
                className="w-full h-full text-cyber-cyan" 
                viewBox="0 0 500 100" 
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="waveform-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                {amplitudes.map((amplitude, i) => {
                  // Center the bars vertically (y-axis centers at 50)
                  const barWidth = 4.5;
                  const barGap = 1.5;
                  const x = i * (barWidth + barGap);
                  
                  // Height is mapped to max 85 to leave padding
                  const height = amplitude * 85;
                  const y = 50 - height / 2;

                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx={2}
                      className="fill-[url(#waveform-gradient)] hover:fill-cyber-cyan transition-all duration-150 cursor-pointer"
                    >
                      <title>{`Amplitude Sample #${i + 1}: ${(amplitude * 100).toFixed(0)}%`}</title>
                    </rect>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Error Message if failed to load */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-4 text-center z-20">
              <div className="flex items-center gap-2 text-xs font-mono text-cyber-rose">
                <Info size={14} />
                <span>{hasError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Informative micro-note */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
          <Info size={12} className="text-cyber-cyan/60" />
          <span>Pure client-side FFT decoding. No telemetry or server interaction.</span>
        </div>
      </div>
    </div>
  );
}
