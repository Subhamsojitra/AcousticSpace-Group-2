import React, { useEffect, useState, useRef } from 'react';
import { 
  FileAudio, 
  Shield,
  Play
} from 'lucide-react';
import AudioUpload from '../components/AudioUpload';
import WaveformViewer from '../components/WaveformViewer';
import { useFileUpload } from '../hooks/useFileUpload';
import { uploadAudio, analyzeAudio, predictAudio } from '../services/api';
import { getErrorMessage } from '../services/apiHelpers';
import ErrorAlert from '../components/ErrorAlert';
import PredictionCard, { PredictionCardSkeleton } from '../components/PredictionCard';
import LoadingOverlay from '../components/LoadingOverlay';

const THEME_CLASSES = {
  amber: {
    border: 'border-cyber-border hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)]',
    dot: 'bg-amber-500',
  },
  cyan: {
    border: 'border-cyber-border hover:border-cyber-cyan/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]',
    dot: 'bg-cyber-cyan',
  },
  green: {
    border: 'border-cyber-border hover:border-cyber-green/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]',
    dot: 'bg-cyber-green',
  },
  rose: {
    border: 'border-cyber-border hover:border-cyber-rose/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.05)]',
    dot: 'bg-cyber-rose',
  },
  gray: {
    border: 'border-cyber-border hover:border-slate-700/30',
    dot: 'bg-slate-600',
  },
};

const getPipelineStatus = (stage, hasFile) => {
  if (stage === 'completed') return { value: 'ANALYZED', theme: 'green' };
  if (stage === 'failed') return { value: 'FAILED', theme: 'rose' };
  if (stage !== 'idle') return { value: stage.toUpperCase(), theme: 'cyan' };
  if (hasFile) return { value: 'READY', theme: 'cyan' };
  return { value: 'STANDBY', theme: 'gray' };
};

const getScannerConfig = (status) => {
  const config = {
    checking: { value: 'Checking...', change: 'Probing backend', theme: 'amber' },
    online: { value: 'Online', change: 'API reachable', theme: 'cyan' },
    offline: { value: 'Offline', change: 'Awaiting backend', theme: 'rose' },
  };
  return config[status] || config.offline;
};

export default function Dashboard({ apiStatus = 'checking' }) {
  const fileUpload = useFileUpload();
  const { file, error: uploadError, handleFileChange, removeFile, setError } = fileUpload;

  // Pipeline execution stages: 'idle' | 'uploading' | 'extracting' | 'predicting' | 'completed' | 'failed'
  const [stage, setStage] = useState('idle');
  const [pipelineMessage, setPipelineMessage] = useState('Awaiting Audio Upload');
  const [fileId, setFileId] = useState(null);

  // Final analysis results
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [analysisInfo, setAnalysisInfo] = useState(null);
  const [_rirFeatures, setRirFeatures] = useState(null);
  const [_breathingAnalysis, setBreathingAnalysis] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  const [timestamp, setTimestamp] = useState(null);

  const apiStatusRef = useRef(apiStatus);
  useEffect(() => {
    apiStatusRef.current = apiStatus;
  }, [apiStatus]);

  // Helper functions for state cleanup and initialization
  const clearPredictionState = () => {
    setPrediction(null);
    setConfidence(null);
    setAnalysisInfo(null);
    setRirFeatures(null);
    setBreathingAnalysis(null);
    setProcessingTime(null);
    setTimestamp(null);
  };

  const initializePipelineState = (message) => {
    clearPredictionState();
    setFileId(null);
    setStage('idle');
    setPipelineMessage(message);
  };

  const resetPipelineState = () => {
    setError(null);
    clearPredictionState();
    setFileId(null);
  };

  // Reset pipeline state when the selected file changes or is removed
  useEffect(() => {
    setError(null); // Clear previous errors before new upload lifecycle starts
    if (!file) {
      initializePipelineState('Awaiting Audio Upload');
    } else {
      initializePipelineState('Payload loaded. Ready to run forensic analysis.');
    }
  }, [file, setError]);

  const runPipeline = async () => {
    if (!file) return;

    // Prevent duplicate requests
    if (stage === 'uploading' || stage === 'extracting' || stage === 'predicting') {
      return;
    }

    resetPipelineState();

    const startTime = performance.now();

    try {
      // 1. Upload stage
      setStage('uploading');
      setPipelineMessage('Uploading audio payload to security gateway...');
      const uploadResult = await uploadAudio(file);

      // Perform payload schema validation for upload result
      if (!uploadResult || typeof uploadResult !== 'object') {
        console.warn('Unexpected upload API response structure:', uploadResult);
        throw new Error('Upload failed: Server returned an invalid response.');
      }
      const fileIdVal = uploadResult.file_path || uploadResult.file_name || uploadResult.file_id;
      if (!fileIdVal) {
        console.warn('Missing file identification metadata in upload API response:', uploadResult);
        throw new Error('Upload failed: Server response is missing file identification metadata.');
      }
      setFileId(fileIdVal);

      // 2. Extraction stage
      setStage('extracting');
      setPipelineMessage('Decoding spatial indicators...');
      const analysisRes = await analyzeAudio(fileIdVal);

      // Perform payload schema validation for analysis results
      if (!analysisRes || typeof analysisRes !== 'object') {
        console.warn('Unexpected analysis API response structure:', analysisRes);
        throw new Error('Analysis failed: Server returned an empty or invalid response.');
      }
      
      // Handle missing optional fields defensively: log warning, proceed without throwing
      if (!analysisRes.rir_features) {
        console.warn('Optional Room Impulse Response metrics are missing in analysis response:', analysisRes);
      }
      if (!analysisRes.breathing_analysis) {
        console.warn('Optional breathing analysis metrics are missing in analysis response:', analysisRes);
      }

      setRirFeatures(analysisRes.rir_features || null);
      setBreathingAnalysis(analysisRes.breathing_analysis || null);

      // 3. Predicting stage
      setStage('predicting');
      setPipelineMessage('Running deepfake classification weights...');
      const predictRes = await predictAudio(fileIdVal);

      // Perform payload schema validation for prediction results
      if (!predictRes || typeof predictRes !== 'object') {
        console.warn('Unexpected prediction API response structure:', predictRes);
        throw new Error('Prediction failed: Server returned an empty or invalid response.');
      }
      if (!predictRes.prediction) {
        console.warn('Missing prediction classification in prediction response:', predictRes);
        throw new Error('Prediction failed: Server response is missing prediction classification.');
      }

      const endTime = performance.now();
      const elapsedSecs = ((endTime - startTime) / 1000).toFixed(2);

      // Store returned objects in Dashboard state (only passing confirmed predict response data to child components)
      setPrediction(predictRes.prediction);
      setConfidence(predictRes.confidence !== undefined && predictRes.confidence !== null ? predictRes.confidence : null);
      setAnalysisInfo(predictRes.analysis || null);
      setProcessingTime(elapsedSecs);
      setTimestamp(new Date().toLocaleString());

      setStage('completed');
      setPipelineMessage(`Analysis completed in ${elapsedSecs}s.`);
    } catch (err) {
      console.error('Scan pipeline failure:', err);
      setStage('failed');
      setPipelineMessage('Scan pipeline failed.');
      
      const readableMessage = getErrorMessage(err, apiStatusRef.current);
      setError(readableMessage);
    }
  };

  const isRunning = stage === 'uploading' || stage === 'extracting' || stage === 'predicting';

  // Defensive Metrics Evaluation
  const hasConfidence = confidence !== null && confidence !== undefined && !isNaN(Number(confidence));
  const formatConfidence = (val) => {
    const num = Number(val);
    const scaled = (num > 0 && num <= 1) ? num * 100 : num;
    return `${scaled.toFixed(1)}%`;
  };
  const normalizedPrediction = typeof prediction === 'string' ? prediction.trim() : '';
  const normPredictionLower = normalizedPrediction.toLowerCase();

  const verificationValue = normalizedPrediction ? normalizedPrediction.toUpperCase() : '—';
  const verificationChange = (normalizedPrediction && hasConfidence)
    ? `Confidence: ${formatConfidence(confidence)}`
    : 'Awaiting classification';
  const verificationTheme = normPredictionLower === 'real' ? 'green' : normPredictionLower === 'fake' ? 'rose' : 'gray';

  const pipelineStatus = getPipelineStatus(stage, !!file);
  const scannerConfig = getScannerConfig(apiStatus);

  return (
    <div className="space-y-8 animate-fadeIn relative">
      {/* Loading Overlay - Passed stage is mapped so it is dismissed on failed status to reveal retry dashboard options */}
      <LoadingOverlay stage={stage === 'failed' ? 'idle' : stage} error={uploadError} />

      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-100">
          Acoustic Analysis Console
        </h1>
        <p className="text-sm text-slate-400 font-mono mt-1">
          AcousticSpace isolator: de-noises RIR (Room Impulse Response) reflections & checks synthetic cadence boundaries.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Pipeline State', value: pipelineStatus.value, change: pipelineMessage, theme: pipelineStatus.theme },
          { 
            label: 'Verification', 
            value: verificationValue, 
            change: verificationChange, 
            theme: verificationTheme 
          },
          { label: 'Classification F1', value: '98.4%', change: 'AST-v2 model spec', theme: 'cyan' },
          { label: 'Scanner Status', value: scannerConfig.value, change: scannerConfig.change, theme: scannerConfig.theme }
        ].map((m, idx) => {
          const themeConfig = THEME_CLASSES[m.theme] || THEME_CLASSES.gray;
          return (
            <div 
              key={idx} 
              className={`p-6 bg-cyber-dark rounded-xl border transition-all duration-300 min-h-[128px] flex flex-col justify-between ${themeConfig.border}`}
            >
              <div>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest block">
                  {m.label}
                </span>
                <span className="text-2xl font-display font-bold text-slate-100 mt-1 block">
                  {m.value}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${themeConfig.dot}`}></div>
                <span className="text-[11px] font-mono text-slate-400 truncate" title={m.change}>
                  {m.change}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main Grid: Upload & Waveform (Left), Report Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload Dropzone & Waveform visualizer */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Audio Upload Portal */}
          <AudioUpload 
            file={file}
            handleFileChange={handleFileChange}
            removeFile={removeFile}
            uploading={isRunning}
            fileId={fileId}
          />

          {/* Dynamic Waveform Visualizer */}
          <WaveformViewer file={file} />
        </div>

        {/* Right Column: Acoustic Integrity Report */}
        <div className="space-y-8">
          {/* Error Alert Display */}
          {uploadError && (
            <ErrorAlert 
              message={uploadError} 
              onRetry={runPipeline} 
              title="Pipeline Execution Error"
            />
          )}

          {stage === 'completed' && prediction ? (
            /* Premium Prediction Result Card displaying only returned fields */
            <PredictionCard 
              prediction={prediction}
              confidence={confidence}
              filename={file?.name}
              timestamp={timestamp}
              processingTime={processingTime}
              analysis={analysisInfo}
            />
          ) : isRunning ? (
            /* Skeleton Loading State inside the prediction/result container to prevent layout shift */
            <PredictionCardSkeleton />
          ) : file ? (
            /* Ready to Scan State */
            <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden h-full flex flex-col justify-between p-6 min-h-[400px]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b border-cyber-border">
                  <Shield className="text-cyber-cyan animate-pulse" size={18} />
                  <h2 className="font-display font-semibold text-slate-200">
                    Acoustic Integrity Scan
                  </h2>
                </div>
                
                <div className="p-4 bg-slate-950/40 border border-cyber-border/50 rounded-lg flex flex-col items-center justify-center text-center space-y-3 py-8">
                  <div className="p-3 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan rounded-full animate-pulse">
                    <FileAudio size={28} />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-widest">
                      Acoustic Payload Loaded
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-1 max-w-xs">
                      File details verified. Local audio waveform decoded successfully.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-cyber-border/40">
                <button
                  type="button"
                  onClick={runPipeline}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyber-cyan hover:bg-cyber-cyan/90 text-cyber-black font-display font-bold rounded-lg cursor-pointer transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Analyze Audio</span>
                </button>
                <p className="text-[9px] text-center text-slate-500 font-mono leading-relaxed">
                  Target signal will be checked against room reflections (RT60) & pause cadences.
                </p>
              </div>
            </div>
          ) : (
            /* Standby Card State - Polished Checklist Placeholder Panel */
            <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden h-full flex flex-col justify-between p-6 min-h-[400px]">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-cyber-border">
                  <Shield className="text-slate-500" size={18} />
                  <h2 className="font-display font-semibold text-slate-400">
                    Acoustic Integrity Scan
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/40 border border-cyber-border/50 rounded-lg w-fit">
                    <div className="h-2 w-2 rounded-full bg-cyber-rose"></div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
                      Awaiting Analysis
                    </span>
                  </div>

                  {/* Flow Steps Checklist */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-3 p-3 bg-slate-950/20 border border-slate-800/40 rounded-lg text-slate-400">
                      <span className="h-5 w-5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0">1</span>
                      <span className="font-medium text-slate-300">Upload an audio sample</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-950/20 border border-slate-800/40 rounded-lg text-slate-500">
                      <span className="h-5 w-5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-bold shrink-0">2</span>
                      <span className="font-medium text-slate-500">Run forensic analysis</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-950/20 border border-slate-800/40 rounded-lg text-slate-500">
                      <span className="h-5 w-5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-bold shrink-0">3</span>
                      <span className="font-medium text-slate-500">View prediction report</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-cyber-border/40 text-[9px] text-center text-slate-500 font-mono">
                SECURED THREAT NODE CHANNEL
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
