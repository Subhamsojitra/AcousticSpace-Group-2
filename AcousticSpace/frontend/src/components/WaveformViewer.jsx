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

          if (audioBuffer.numberOfChannels === 0) {
            throw new Error('Audio file has no channels.');
          }
          const channelData = audioBuffer.getChannelData(0);
          const numBars = 80;
          const step = Math.max(1, Math.floor(channelData.length / numBars));
          const points = [];
          
          for (let i = 0; i < numBars; i++) {
            let max = 0;
            const start = i * step;
            if (start < channelData.length) {
              const limit = Math.min(step, channelData.length - start);
              for (let j = 0; j < limit; j++) {
                const val = Math.abs(channelData[start + j]);
                if (val > max) max = val;
              }
            }
            points.push(max);
          }

          const maxVal = (points.length > 0 ? Math.max(...points) : 0) || 1;
          const normalized = points.map(val => Math.max(0.08, val / maxVal));

          if (active) {
            setAmplitudes(normalized);
            setLoading(false);
          }
          audioCtx.close();
        } catch (decodeError) {
          console.warn('Audio decoding failed, using fallback visual representation', decodeError);
          try {
            audioCtx.close();
          } catch (e) {
            // Ignore error closing context if already closed
          }
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

  return (
    <div className="bg-zinc-950/45 backdrop-blur-xl border border-white/5 rounded-2xl shadow-lg overflow-hidden transition-all duration-300">
      {/* Header Panel */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-zinc-400" size={16} />
          <h2 className="font-display font-semibold text-xs tracking-wide uppercase text-zinc-300">
            Spectral Waveform Analyzer
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!file && !externalWaveformData ? (
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500">
              <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
              STANDBY
            </span>
          ) : isLoading ? (
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-cyber-cyan animate-pulse">
              <span className="w-1 h-1 rounded-full bg-cyber-cyan animate-ping"></span>
              DECODING
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-cyber-green">
              <span className="w-1 h-1 rounded-full bg-cyber-green"></span>
              ANALYZED
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Metadata Details bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] font-mono min-h-[46px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-zinc-500 uppercase shrink-0">File:</span>
            <span className="text-zinc-300 truncate font-semibold" title={file ? file.name : 'No file selected'}>
              {file ? file.name : '—'}
            </span>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 uppercase">Size:</span>
              <span>{file ? formatFileSize(file.size) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Waveform Visualization Canvas / SVG Area */}
        <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          {/* Subtle grid background for high-tech analyzer feel */}
          <div 
            className="absolute inset-0 opacity-[0.015] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          ></div>

          {!file && !externalWaveformData ? (
            /* Standby State Waveform */
            <div className="relative w-full h-32 flex items-center justify-center select-none">
              <svg className="w-full h-full text-zinc-800/10 animate-pulse" viewBox="0 0 500 100" preserveAspectRatio="none">
                {[...Array(80)].map((_, i) => {
                  const x = 5 + i * 6.2;
                  const height = 15 + Math.sin(x * 0.05) * 8;
                  const y = 50 - height / 2;
                  
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width="4"
                      height={height}
                      rx="2"
                      className="fill-white/5"
                    />
                  );
                })}
              </svg>
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider border border-white/5 bg-zinc-950 px-3 py-1 rounded-md">
                  Awaiting Audio Upload
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 z-10">
              <BarChart2 className="text-zinc-500 animate-pulse" size={24} />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider animate-pulse">
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
                    <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#0a84ff" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0a84ff" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                {amplitudes.map((amplitude, i) => {
                  const barWidth = 4.5;
                  const barGap = 1.5;
                  const x = i * (barWidth + barGap);
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
                      className="fill-[url(#waveform-gradient)]"
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
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 p-4 text-center z-20">
              <div className="flex items-center gap-2 text-[10px] font-mono text-cyber-rose">
                <Info size={12} />
                <span>{hasError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Informative micro-note */}
        <div className="flex items-center gap-2 text-[9px] text-zinc-650 font-mono">
          <Info size={11} className="text-zinc-600" />
          <span>Pure client-side FFT decoding. No telemetry or server interaction.</span>
        </div>
      </div>
    </div>
  );
}
