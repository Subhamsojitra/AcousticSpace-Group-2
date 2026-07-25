import React from 'react';
import { ShieldCheck, ShieldAlert, AudioLines, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import InfoRow from './InfoRow';
import {
  formatConfidence,
  formatDuration,
  formatSampleRate,
  formatProcessingTime
} from '../services/apiHelpers';

/**
 * Reusable PredictionCard component.
 * Renders a cybersecurity-themed prediction results dashboard card.
 * Displays only authentic parameters returned from the backend API PredictionResponse.
 */
export default function PredictionCard({
  prediction,
  confidence,
  filename,
  timestamp,
  processingTime,
  analysis = null,
}) {
  const isReal = typeof prediction === 'string' && prediction.trim().toLowerCase() === 'real';
  const confidencePercent = formatConfidence(confidence);

  // Normalize confidence for progress bar width percentage
  let confidenceVal = 0;
  if (confidence !== null && confidence !== undefined && !isNaN(Number(confidence))) {
    const num = Number(confidence);
    confidenceVal = (num > 0 && num <= 1) ? num * 100 : num;
  }

  // Audio properties from prediction response
  const sampleRateText = formatSampleRate(analysis?.sample_rate);
  const durationText = formatDuration(analysis?.duration);
  const processingTimeText = formatProcessingTime(processingTime);

  return (
    <div className={`p-6 border rounded-xl transition-all duration-500 bg-cyber-dark animate-fadeIn ${
      isReal 
        ? 'border-cyber-green/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' 
        : 'border-cyber-rose/30 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
    }`}>
      
      {/* 1. SCAN SUMMARY SECTION */}
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

      {/* 2. PREDICTION RESULT SECTION */}
      <div className="space-y-4 mb-6">
        <div className={`p-4 border rounded-lg font-mono text-xs leading-relaxed ${
          isReal 
            ? 'bg-cyber-green/5 border-cyber-green/20 text-slate-200' 
            : 'bg-cyber-rose/5 border-cyber-rose/20 text-slate-200'
        }`}>
          <span className="font-bold uppercase tracking-wider block mb-1">
            Verdict: {prediction ? (isReal ? 'AUTHENTIC' : 'SUSPICIOUS / DEEPFAKE') : 'UNKNOWN'}
          </span>
          This audio signal has been classified as <strong className={isReal ? 'text-cyber-green' : 'text-cyber-rose'}>{(prediction || 'Unknown').toUpperCase()}</strong> with a classification confidence score of <strong className="text-slate-100">{confidencePercent}</strong>.
        </div>

        {/* Confidence progress bar */}
        <div className="space-y-2">
          <InfoRow 
            label="Classifier Confidence" 
            value={confidencePercent} 
            variant="row" 
            labelClassName="text-xs text-slate-400 font-mono"
            valueClassName={isReal ? 'text-cyber-green font-bold text-xs' : 'text-cyber-rose font-bold text-xs'}
          />
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div 
              className={`h-full transition-all duration-1000 rounded-full ${
                isReal ? 'bg-gradient-to-r from-cyber-cyan to-cyber-green' : 'bg-gradient-to-r from-cyber-rose to-amber-500'
              }`} 
              style={{ width: `${confidenceVal}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. AUDIO INFORMATION SECTION */}
      <div className="space-y-4 pt-4 border-t border-cyber-border/40">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          <AudioLines size={12} className="text-cyber-cyan" />
          <span>Audio Information</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <InfoRow 
            label="Duration" 
            value={durationText} 
            variant="card" 
          />
          <InfoRow 
            label="Sample Rate" 
            value={sampleRateText} 
            variant="card" 
          />
        </div>
      </div>

      {/* 4. PROCESSING INFORMATION SECTION */}
      <div className="mt-6 pt-4 border-t border-cyber-border/40 text-[9px] font-mono text-slate-500 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest mb-1">
          <Clock size={11} className="text-slate-500" />
          <span>Processing Information</span>
        </div>

        <InfoRow 
          label="SCAN DATE" 
          value={timestamp || '—'} 
          variant="row" 
          labelClassName="text-[9px] text-slate-500"
          valueClassName="text-slate-400 text-[9px]"
        />

        <InfoRow 
          label="PIPELINE COST TIME" 
          value={processingTimeText} 
          variant="row" 
          labelClassName="text-[9px] text-slate-500"
          valueClassName="text-slate-400 text-[9px]"
        />
      </div>
    </div>
  );
}

/**
 * Lightweight PredictionCardSkeleton component for loading states.
 * Pre-sizes exactly to the PredictionCard dimensions to prevent layout shifts.
 */
export function PredictionCardSkeleton() {
  return (
    <div className="p-6 border border-cyber-border/40 rounded-xl bg-cyber-dark animate-pulse flex flex-col">
      {/* 1. Scan Summary Skeleton */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-16 bg-slate-800 rounded"></div>
            <div className="h-3.5 w-12 bg-slate-800 rounded"></div>
          </div>
          <div className="h-6 w-3/4 bg-slate-800 rounded"></div>
        </div>
        <div className="h-12 w-12 bg-slate-800/50 border border-slate-800 rounded-lg shrink-0"></div>
      </div>

      {/* 2. Prediction Result Skeleton */}
      <div className="space-y-4 mb-6">
        <div className="h-16 w-full bg-slate-900/60 border border-slate-800/50 rounded-lg"></div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-28 bg-slate-800 rounded"></div>
            <div className="h-3 w-10 bg-slate-800 rounded"></div>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-900"></div>
        </div>
      </div>

      {/* 3. Audio Information Skeleton */}
      <div className="space-y-4 pt-4 border-t border-cyber-border/40">
        <div className="h-3.5 w-32 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-14 bg-slate-950/40 border border-cyber-border/50 rounded-lg"></div>
          <div className="h-14 bg-slate-950/40 border border-cyber-border/50 rounded-lg"></div>
        </div>
      </div>

      {/* 4. Processing Information Skeleton */}
      <div className="mt-6 pt-4 border-t border-cyber-border/40 text-slate-800 space-y-2.5">
        <div className="h-3.5 w-32 bg-slate-800 rounded mb-1"></div>
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-slate-800/60 rounded"></div>
          <div className="h-3 w-24 bg-slate-800/60 rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-slate-800/60 rounded"></div>
          <div className="h-3 w-12 bg-slate-800/60 rounded"></div>
        </div>
      </div>
    </div>
  );
}
