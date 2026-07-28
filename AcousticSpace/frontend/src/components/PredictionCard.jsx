import React, { memo } from 'react';
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
function PredictionCard({
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
    <div className={`p-6 border rounded-2xl transition-all duration-500 bg-cyber-dark backdrop-blur-xl animate-fadeIn ${
      isReal 
        ? 'border-cyber-green/20' 
        : 'border-cyber-rose/20'
    }`}>
      
      {/* 1. SCAN SUMMARY SECTION */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider">
              SCAN RESULT
            </span>
            <StatusBadge status={prediction ? (isReal ? 'real' : 'fake') : 'unknown'} />
          </div>
          <h2 className="text-base font-semibold tracking-tight text-text-primary truncate" title={filename}>
            {filename || 'unknown_payload.wav'}
          </h2>
        </div>
        
        <div className={`p-2.5 rounded-lg border shrink-0 ${
          isReal 
            ? 'bg-white/5 border-cyber-green/20 text-cyber-green' 
            : 'bg-white/5 border-cyber-rose/20 text-cyber-rose'
        }`}>
          {isReal ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
        </div>
      </div>

      {/* 2. PREDICTION RESULT SECTION */}
      <div className="space-y-4 mb-6">
        <div className={`p-4 border rounded-xl font-mono text-[11px] leading-relaxed ${
          isReal 
            ? 'bg-white/[0.01] border-cyber-green/10 text-text-secondary' 
            : 'bg-white/[0.01] border-cyber-rose/10 text-text-secondary'
        }`}>
          <span className="font-bold uppercase tracking-wider block mb-1 text-text-primary">
            Verdict: {prediction ? (isReal ? 'AUTHENTIC' : 'SUSPICIOUS / DEEPFAKE') : 'UNKNOWN'}
          </span>
          This audio signal has been classified as <strong className={isReal ? 'text-cyber-green' : 'text-cyber-rose'}>{(prediction || 'Unknown').toUpperCase()}</strong> with a classification confidence score of <strong className="text-text-primary">{confidencePercent}</strong>.
        </div>

        {/* Confidence progress bar */}
        <div className="space-y-2">
          <InfoRow 
            label="Classifier Confidence" 
            value={confidencePercent} 
            variant="row" 
            labelClassName="text-xs text-text-secondary font-mono"
            valueClassName={isReal ? 'text-cyber-green font-bold text-xs' : 'text-cyber-rose font-bold text-xs'}
          />
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-cyber-border">
            <div 
              className={`h-full transition-all duration-1000 rounded-full ${
                isReal ? 'bg-[#30d158]' : 'bg-[#ff453a]'
              }`} 
              style={{ width: `${confidenceVal}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. AUDIO INFORMATION SECTION */}
      <div className="space-y-3 pt-4 border-t border-cyber-border">
        <div className="flex items-center gap-2 text-[9px] font-mono text-text-secondary uppercase tracking-wider">
          <AudioLines size={11} className="text-text-secondary" />
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
      <div className="mt-6 pt-4 border-t border-cyber-border text-[9px] font-mono text-text-secondary space-y-2">
        <div className="flex items-center gap-1.5 text-[9px] text-text-secondary uppercase tracking-wider mb-1">
          <Clock size={11} className="text-text-secondary" />
          <span>Processing Information</span>
        </div>

        <InfoRow 
          label="SCAN DATE" 
          value={timestamp || '—'} 
          variant="row" 
          labelClassName="text-[9px] text-text-secondary"
          valueClassName="text-text-primary text-[9px]"
        />

        <InfoRow 
          label="PIPELINE COST TIME" 
          value={processingTimeText} 
          variant="row" 
          labelClassName="text-[9px] text-text-secondary"
          valueClassName="text-text-primary text-[9px]"
        />
      </div>
    </div>
  );
}

export default memo(PredictionCard);


/**
 * Lightweight PredictionCardSkeleton component for loading states.
 * Pre-sizes exactly to the PredictionCard dimensions to prevent layout shifts.
 */
export function PredictionCardSkeleton() {
  return (
    <div className="p-6 border border-cyber-border rounded-2xl bg-cyber-dark backdrop-blur-xl animate-pulse flex flex-col">
      {/* 1. Scan Summary Skeleton */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-16 bg-white/5 rounded"></div>
            <div className="h-3.5 w-12 bg-white/5 rounded"></div>
          </div>
          <div className="h-6 w-3/4 bg-white/5 rounded"></div>
        </div>
        <div className="h-10 w-10 bg-white/5 border border-cyber-border rounded-lg shrink-0"></div>
      </div>

      {/* 2. Prediction Result Skeleton */}
      <div className="space-y-4 mb-6">
        <div className="h-16 w-full bg-white/[0.01] border border-cyber-border rounded-xl"></div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-28 bg-white/5 rounded"></div>
            <div className="h-3 w-10 bg-white/5 rounded"></div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full border border-cyber-border"></div>
        </div>
      </div>

      {/* 3. Audio Information Skeleton */}
      <div className="space-y-4 pt-4 border-t border-cyber-border">
        <div className="h-3 w-32 bg-white/5 rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-14 bg-white/[0.01] border border-cyber-border rounded-xl"></div>
          <div className="h-14 bg-white/[0.01] border border-cyber-border rounded-xl"></div>
        </div>
      </div>

      {/* 4. Processing Information Skeleton */}
      <div className="mt-6 pt-4 border-t border-cyber-border text-zinc-800 space-y-2.5">
        <div className="h-3.5 w-32 bg-white/5 rounded mb-1"></div>
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-white/5 rounded"></div>
          <div className="h-3 w-24 bg-white/5 rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-white/5 rounded"></div>
          <div className="h-3 w-12 bg-white/5 rounded"></div>
        </div>
      </div>
    </div>
  );
}
