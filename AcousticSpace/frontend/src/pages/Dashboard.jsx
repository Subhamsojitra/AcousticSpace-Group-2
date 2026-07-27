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
import { 
  getErrorMessage,
  formatConfidence,
  normalizePrediction
} from '../services/apiHelpers';
import ErrorAlert from '../components/ErrorAlert';
import PredictionCard, { PredictionCardSkeleton } from '../components/PredictionCard';
import LoadingOverlay from '../components/LoadingOverlay';

const THEME_CLASSES = {
  amber: {
    border: 'border-cyber-border hover:border-cyber-border/40 bg-white/[0.01]',
    dot: 'bg-amber-500',
  },
  cyan: {
    border: 'border-cyber-border hover:border-cyber-border/40 bg-white/[0.01]',
    dot: 'bg-cyber-cyan',
  },
  green: {
    border: 'border-cyber-border hover:border-cyber-border/40 bg-white/[0.01]',
    dot: 'bg-cyber-green',
  },
  rose: {
    border: 'border-cyber-border hover:border-cyber-border/40 bg-white/[0.01]',
    dot: 'bg-cyber-rose',
  },
  gray: {
    border: 'border-cyber-border hover:border-cyber-border/40 bg-white/[0.01]',
    dot: 'bg-zinc-600',
  },
};

const getPipelineStatus = (stage, hasFile) => {
  if (stage === 'completed') return { value: 'ANALYZED', theme: 'green' };
  if (stage === 'failed') return { value: 'FAILED', theme: 'rose' };
  if (stage === 'extracting' || stage === 'predicting') return { value: 'ANALYZING', theme: 'cyan' };
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
  const { file, error: pipelineError, handleFileChange, removeFile, setError: setPipelineError } = fileUpload;

  // Pipeline execution stages: 'idle' | 'uploading' | 'extracting' | 'predicting' | 'completed' | 'failed'
  const [stage, setStage] = useState('idle');
  const [pipelineMessage, setPipelineMessage] = useState('Awaiting Audio Upload');
  const [fileId, setFileId] = useState(null);

  // Final analysis results
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [analysisInfo, setAnalysisInfo] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  const [timestamp, setTimestamp] = useState(null);

  const isExecutingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const apiStatusRef = useRef(apiStatus);
  useEffect(() => {
    apiStatusRef.current = apiStatus;
  }, [apiStatus]);

  // Helper functions for state cleanup and initialization
  const clearPredictionState = () => {
    setPrediction(null);
    setConfidence(null);
    setAnalysisInfo(null);
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
    setPipelineError(null);
    clearPredictionState();
    setFileId(null);
  };

  // Reset pipeline state when the selected file changes or is removed
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isExecutingRef.current = false;

    setPipelineError(null); // Clear previous errors before new upload lifecycle starts
    if (!file) {
      initializePipelineState('Awaiting Audio Upload');
    } else {
      initializePipelineState('Payload loaded. Ready to run forensic analysis.');
    }
  }, [file, setPipelineError]);

  // Handle component unmount cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const runPipeline = async () => {
    if (!file) return;

    // Prevent duplicate requests
    if (isExecutingRef.current) {
      return;
    }
    isExecutingRef.current = true;

    // Abort in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    resetPipelineState();

    const startTime = performance.now();

    try {
      // 1. Upload stage
      setStage('uploading');
      setPipelineMessage('Uploading audio payload to security gateway...');
      const uploadResult = await uploadAudio(file, signal);
      const fileIdVal = uploadResult.file_path || uploadResult.file_name || uploadResult.file_id;
      setFileId(fileIdVal);

      // 2. Extraction stage
      setStage('extracting');
      setPipelineMessage('Decoding spatial indicators...');
      await analyzeAudio(fileIdVal, signal);

      // 3. Predicting stage
      setStage('predicting');
      setPipelineMessage('Running deepfake classification weights...');
      const predictRes = await predictAudio(fileIdVal, signal);

      const endTime = performance.now();
      const elapsedSecs = ((endTime - startTime) / 1000).toFixed(2);

      // Store returned objects in Dashboard state
      setPrediction(predictRes.prediction);
      setConfidence(predictRes.confidence !== undefined && predictRes.confidence !== null ? predictRes.confidence : null);
      setAnalysisInfo(predictRes.analysis || null);
      setProcessingTime(elapsedSecs);
      setTimestamp(new Date().toLocaleString());

      setStage('completed');
      setPipelineMessage(`Analysis completed in ${elapsedSecs}s.`);
    } catch (err) {
      if (err.name === 'AbortError' || (err.message && err.message.includes('aborted')) || signal.aborted) {
        return;
      }
      console.error('Scan pipeline failure:', err);
      setStage('failed');
      setPipelineMessage('Scan pipeline failed.');
      
      const readableMessage = getErrorMessage(err, apiStatusRef.current);
      setPipelineError(readableMessage);
    } finally {
      if (abortControllerRef.current === controller) {
        isExecutingRef.current = false;
        abortControllerRef.current = null;
      }
    }
  };

  const isRunning = stage === 'uploading' || stage === 'extracting' || stage === 'predicting';

  // Defensive Metrics Evaluation
  const hasConfidence = confidence !== null && confidence !== undefined && !isNaN(Number(confidence));
  const normPrediction = normalizePrediction(prediction);

  const verificationValue = normPrediction ? normPrediction.toUpperCase() : '—';
  const verificationChange = (normPrediction && hasConfidence)
    ? `Confidence: ${formatConfidence(confidence)}`
    : 'Awaiting classification';
  const verificationTheme = normPrediction === 'real' ? 'green' : normPrediction === 'fake' ? 'rose' : 'gray';

  const pipelineStatus = getPipelineStatus(stage, !!file);
  const scannerConfig = getScannerConfig(apiStatus);

  const renderIntegrityScanCard = ({ isReady, content, footer }) => {
    const shieldClass = isReady ? 'text-[#0a84ff]' : 'text-text-secondary';
    const titleClass = isReady ? 'text-text-primary' : 'text-text-secondary';
    return (
      <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl shadow-sm h-full flex flex-col justify-between p-6 min-h-[400px] metric-card">
        <div className={isReady ? 'space-y-4' : 'space-y-6'}>
          <div className="flex items-center gap-2 pb-4 border-b border-cyber-border">
            <Shield className={shieldClass} size={16} />
            <h2 className={`font-display font-semibold text-xs tracking-wide uppercase ${titleClass}`}>
              Acoustic Integrity Scan
            </h2>
          </div>
          {content}
        </div>
        {footer}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn relative">
      {/* Loading Overlay */}
      <LoadingOverlay stage={stage} error={pipelineError} />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Acoustic Analysis Console
        </h1>
        <p className="text-xs text-text-secondary mt-1.5 font-normal">
          AcousticSpace: De-noises room reflections (RIR) and analyzes speech cadence boundaries.
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
              className={`p-5 bg-cyber-dark backdrop-blur-md rounded-2xl border min-h-[120px] flex flex-col justify-between metric-card ${themeConfig.border}`}
            >
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">
                  {m.label}
                </span>
                <span className="text-lg font-semibold tracking-tight text-text-primary mt-1 block">
                  {m.value}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${themeConfig.dot}`}></div>
                <span className="text-[10px] text-text-secondary truncate font-normal" title={m.change}>
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

          {/* Dynamic Waveform Viewer */}
          <WaveformViewer file={file} />
        </div>

        {/* Right Column: Acoustic Integrity Report */}
        <div className="space-y-8">
          {/* Error Alert Display */}
          {pipelineError && (
            <ErrorAlert 
              message={pipelineError} 
              onRetry={runPipeline} 
              title="Pipeline Execution Error"
            />
          )}

          {stage === 'completed' && prediction && file ? (
            /* Premium Prediction Result Card displaying only returned fields */
            <PredictionCard 
              prediction={prediction}
              confidence={confidence}
              filename={file.name}
              timestamp={timestamp}
              processingTime={processingTime}
              analysis={analysisInfo}
            />
          ) : isRunning ? (
            /* Skeleton Loading State inside the prediction/result container to prevent layout shift */
            <PredictionCardSkeleton />
          ) : file ? (
            /* Ready to Scan State */
            renderIntegrityScanCard({
              isReady: true,
              content: (
                <div className="p-4 bg-white/[0.01] border border-cyber-border rounded-xl flex flex-col items-center justify-center text-center space-y-3 py-8">
                  <div className="p-3 bg-white/5 border border-cyber-border text-text-primary rounded-full">
                    <FileAudio size={24} className="text-text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                       Acoustic Payload Loaded
                    </h3>
                    <p className="text-[10px] text-text-secondary font-normal mt-1 max-w-xs leading-normal">
                      File details verified. Local audio waveform decoded successfully.
                    </p>
                  </div>
                </div>
              ),
              footer: (
                <div className="space-y-4 pt-6 border-t border-cyber-border">
                  <button
                    type="button"
                    onClick={runPipeline}
                    disabled={isRunning}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 font-medium rounded-lg transition-all duration-200 text-xs tracking-normal ${
                      isRunning
                        ? 'bg-white/5 text-text-secondary border border-cyber-border cursor-not-allowed shadow-none'
                        : 'bg-[#0071e3] text-white hover:bg-[#0077ed] cursor-pointer shadow-sm shadow-blue-500/10'
                    }`}
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Analyze Audio</span>
                  </button>
                  <p className="text-[9px] text-center text-text-secondary font-mono leading-relaxed">
                    Target signal will be checked against room reflections (RT60) & pause cadences.
                  </p>
                </div>
              ),
            })
          ) : (
            /* Standby Card State - Polished Checklist Placeholder Panel */
            renderIntegrityScanCard({
              isReady: false,
              content: (
                <div className="space-y-4">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-cyber-border rounded-md w-fit">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-500"></div>
                    <span className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold font-mono">
                      Awaiting Analysis
                    </span>
                  </div>
 
                  {/* Flow Steps Checklist */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-3 p-3 bg-white/[0.01] border border-cyber-border rounded-xl text-text-secondary">
                      <span className="h-4.5 w-4.5 rounded-full bg-white/5 border border-cyber-border flex items-center justify-center text-[10px] text-text-secondary font-bold shrink-0">1</span>
                      <span className="font-medium text-text-primary">Upload an audio sample</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/[0.01] border border-cyber-border rounded-xl text-text-secondary">
                      <span className="h-4.5 w-4.5 rounded-full bg-white/[0.02] border border-cyber-border flex items-center justify-center text-[10px] text-text-secondary font-bold shrink-0">2</span>
                      <span className="font-medium text-text-primary">Run forensic analysis</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/[0.01] border border-cyber-border rounded-xl text-text-secondary">
                      <span className="h-4.5 w-4.5 rounded-full bg-white/[0.02] border border-cyber-border flex items-center justify-center text-[10px] text-text-secondary font-bold shrink-0">3</span>
                      <span className="font-medium text-text-primary">View prediction report</span>
                    </div>
                  </div>
                </div>
              ),
              footer: (
                <div className="pt-4 border-t border-cyber-border text-[9px] text-center text-text-secondary tracking-widest font-mono">
                  SECURED NODE CHANNEL
                </div>
              ),
            })
          )}
        </div>

      </div>
    </div>
  );
}
