import React from 'react';
import { ShieldCheck, ShieldAlert, AudioLines } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * Reusable PredictionCard component.
 * Renders a cybersecurity-themed prediction results dashboard card.
 * Displays only authentic parameters returned from the backend API PredictionResponse.
 * 
 * @param {Object} props
 * @param {string} props.prediction - 'Real' or 'Fake'
 * @param {number} props.confidence - Confidence score from API (ranges 0 to 100 or 0 to 1)
 * @param {string} props.filename - Audio filename analyzed
 * @param {string} props.timestamp - Timestamp when the scan was executed
 * @param {string|number} props.processingTime - Elapsed pipeline duration
 * @param {Object} [props.analysis] - Analysis info (sample_rate, duration) from PredictionResponse
 */
export default function PredictionCard({
  prediction,
  confidence,
  filename,
  timestamp,
  processingTime,
  analysis = null,
}) {
  const isReal = prediction?.toLowerCase() === 'real';

  // Normalize confidence to display as percentage
  let confidenceVal = typeof confidence === 'number' ? confidence : 0;
  if (confidenceVal > 0 && confidenceVal <= 1) {
    confidenceVal = confidenceVal * 100;
  }
  const confidencePercent = typeof confidence === 'number' ? confidenceVal.toFixed(1) : '—';

  // Audio properties from prediction response
  const sampleRate = analysis?.sample_rate;
  const duration = analysis?.duration;
  const sampleRateText = typeof sampleRate === 'number' ? `${sampleRate} Hz` : '—';
  const durationText = typeof duration === 'number' ? `${duration.toFixed(2)} s` : '—';

  return (
    <div className={`p-6 border rounded-xl transition-all duration-500 bg-cyber-dark animate-fadeIn ${
      isReal 
        ? 'border-cyber-green/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' 
        : 'border-cyber-rose/30 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
    }`}>
      
      {/* Header Info */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              SCAN RESULT
            </span>
            <StatusBadge status={prediction ? (isReal ? 'real' : 'fake') : 'unknown'} />
          </div>
          <h2 className="text-xl font-display font-extrabold text-slate-100 truncate" title={filename}>
            {filename || 'unknown_payload.wav'}
          </h2>
        </div>
        
        <div className={`p-3 rounded-lg border shrink-0 ${
          isReal 
            ? 'bg-cyber-green/5 border-cyber-green/30 text-cyber-green' 
            : 'bg-cyber-rose/5 border-cyber-rose/30 text-cyber-rose'
        }`}>
          {isReal ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
        </div>
      </div>

      {/* Main classification message */}
      <div className={`p-4 border rounded-lg mb-6 font-mono text-xs leading-relaxed ${
        isReal 
          ? 'bg-cyber-green/5 border-cyber-green/20 text-slate-200' 
          : 'bg-cyber-rose/5 border-cyber-rose/20 text-slate-200'
      }`}>
        <span className="font-bold uppercase tracking-wider block mb-1">
          Verdict: {prediction ? (isReal ? 'AUTHENTIC' : 'SUSPICIOUS / DEEPFAKE') : 'UNKNOWN'}
        </span>
        This audio signal has been classified as <strong className={isReal ? 'text-cyber-green' : 'text-cyber-rose'}>{(prediction || 'Unknown').toUpperCase()}</strong> with a classification confidence score of <strong className="text-slate-100">{confidencePercent}%</strong>.
      </div>

      {/* Confidence progress bar */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Classifier Confidence</span>
          <span className={isReal ? 'text-cyber-green font-bold' : 'text-cyber-rose font-bold'}>
            {confidencePercent}%
          </span>
        </div>
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
          <div 
            className={`h-full transition-all duration-1000 rounded-full ${
              isReal ? 'bg-gradient-to-r from-cyber-cyan to-cyber-green' : 'bg-gradient-to-r from-cyber-rose to-amber-500'
            }`} 
            style={{ width: `${confidenceVal}%` }}
          ></div>
        </div>
      </div>

      {/* Audio Signal Properties */}
      <div className="space-y-4 pt-4 border-t border-cyber-border/40">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          <AudioLines size={12} className="text-cyber-cyan" />
          <span>Audio Signal Properties</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-950/40 border border-cyber-border/50 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Duration</span>
            <span className="text-slate-200 font-semibold">{durationText}</span>
          </div>

          <div className="p-3 bg-slate-950/40 border border-cyber-border/50 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Sample Rate</span>
            <span className="text-slate-200 font-semibold">{sampleRateText}</span>
          </div>
        </div>
      </div>

      {/* Metadata info */}
      <div className="mt-6 pt-4 border-t border-cyber-border text-[9px] font-mono text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>SCAN DATE:</span>
          <span className="text-slate-400">{timestamp || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>PIPELINE COST TIME:</span>
          <span className="text-slate-400">{processingTime ? `${processingTime}s` : '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>DETECTION ENDPOINT:</span>
          <span className="text-cyber-cyan uppercase font-bold">API/PREDICT</span>
        </div>
      </div>
    </div>
  );
}
