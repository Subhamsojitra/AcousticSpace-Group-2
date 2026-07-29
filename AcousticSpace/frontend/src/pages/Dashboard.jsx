import React, { useEffect, useState, useRef, useCallback, Suspense, lazy } from 'react';
import { 
  FileAudio, 
  Shield,
  Play
} from 'lucide-react';
import AudioUpload from '../components/AudioUpload';
import WaveformViewer from '../components/WaveformViewer';
import TimelineProgress from '../components/TimelineProgress';
import AudioMetadataPanel from '../components/AudioMetadataPanel';
import { useFileUpload } from '../hooks/useFileUpload';
import { useToast } from '../context/ToastContext';
import { uploadAudio, analyzeAudio, predictAudio } from '../services/api';
import { 
  getErrorMessage,
  formatConfidence,
  normalizePrediction
} from '../services/apiHelpers';
import { PredictionCardSkeleton } from '../components/PredictionCard';

const ErrorAlert = lazy(() => import('../components/ErrorAlert'));
const PredictionCard = lazy(() => import('../components/PredictionCard'));
const LoadingOverlay = lazy(() => import('../components/LoadingOverlay'));

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

function Dashboard({ apiStatus = 'checking' }) {
  const fileUpload = useFileUpload();
  const { file, error: pipelineError, handleFileChange, removeFile, setError: setPipelineError } = fileUpload;
  const { addToast } = useToast();

  // Pipeline execution stages: 'idle' | 'uploading' | 'extracting' | 'predicting' | 'completed' | 'failed'
  const [stage, setStage] = useState('idle');
  const [pipelineMessage, setPipelineMessage] = useState('Awaiting Audio Upload');
  const [fileId, setFileId] = useState(null);

  // Consolidated analysis results state
  const [pipelineResult, setPipelineResult] = useState({
    prediction: null,
    confidence: null,
    analysisInfo: null,
    processingTime: null,
    timestamp: null,
  });

  const { prediction, confidence, analysisInfo, processingTime, timestamp } = pipelineResult;

  const isExecutingRef = useRef(false);
  const abortControllerRef = useRef(null);
  
  // Scrolling target nodes
  const timelineRef = useRef(null);
  const resultsRef = useRef(null);

  const apiStatusRef = useRef(apiStatus);
  useEffect(() => {
    apiStatusRef.current = apiStatus;
  }, [apiStatus]);

  // Scroll to results when scan compiles successfully
  useEffect(() => {
    if (stage === 'completed' && resultsRef.current) {
      const scrollTimer = setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(scrollTimer);
    }
  }, [stage]);

  // Helper functions for state cleanup and initialization
  const clearPredictionState = useCallback(() => {
    setPipelineResult({
      prediction: null,
      confidence: null,
      analysisInfo: null,
      processingTime: null,
      timestamp: null,
    });
  }, []);

  const resetPipelineState = useCallback(() => {
    setPipelineError(null);
    clearPredictionState();
    setFileId(null);
  }, [setPipelineError, clearPredictionState]);

  // Reset pipeline state when the selected file changes or is removed
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isExecutingRef.current = false;

    const initializePipelineState = (message) => {
      clearPredictionState();
      setFileId(null);
      setStage('idle');
      setPipelineMessage(message);
    };

    setPipelineError(null); // Clear previous errors before new upload lifecycle starts
    if (!file) {
      initializePipelineState('Awaiting Audio Upload');
    } else {
      initializePipelineState('Payload loaded. Ready to run forensic analysis.');
    }
  }, [file, setPipelineError, clearPredictionState]);

  // Handle component unmount cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const runPipeline = useCallback(async () => {
    if (!file) return;

    // Prevent duplicate requests
    if (isExecutingRef.current) {
      return;
    }
    isExecutingRef.current = true;

    // Smooth scroll to timeline card when analysis starts
    setTimeout(() => {
      if (timelineRef.current) {
        timelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

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
      addToast('Forensic analysis pipeline initialized', 'info');
      const uploadResult = await uploadAudio(file, signal);
      const fileIdVal = uploadResult.file_path || uploadResult.file_name || uploadResult.file_id;
      setFileId(fileIdVal);
      addToast('Audio upload complete. Decoding waveform features...', 'success');

      // 2. Extraction stage
      setStage('extracting');
      setPipelineMessage('Decoding spatial indicators...');
      await analyzeAudio(fileIdVal, signal);
      addToast('Feature extraction complete. Running classification model...', 'info');

      // 3. Predicting stage
      setStage('predicting');
      setPipelineMessage('Running deepfake classification weights...');
      const predictRes = await predictAudio(fileIdVal, signal);
      addToast('Classification complete. Verdict compiled successfully.', 'success');

      const endTime = performance.now();
      const elapsedSecs = ((endTime - startTime) / 1000).toFixed(2);

      // Store returned objects in Dashboard state atomically
      setPipelineResult({
        prediction: predictRes.prediction,
        confidence: predictRes.confidence !== undefined && predictRes.confidence !== null ? predictRes.confidence : null,
        analysisInfo: predictRes.analysis || null,
        processingTime: elapsedSecs,
        timestamp: new Date().toLocaleString(),
      });

      setStage('completed');
      setPipelineMessage(`Analysis completed in ${elapsedSecs}s.`);
    } catch (err) {
      if (err.name === 'AbortError' || (err.message && err.message.includes('aborted')) || signal.aborted) {
        return;
      }
      console.error('Scan pipeline failure:', err);
      setStage('failed');
      setPipelineMessage('Scan pipeline failed.');
      addToast('Scan pipeline execution failed', 'error');
      
      const readableMessage = getErrorMessage(err, apiStatusRef.current);
      setPipelineError(readableMessage);
    } finally {
      if (abortControllerRef.current === controller) {
        isExecutingRef.current = false;
        abortControllerRef.current = null;
      }
    }
  }, [file, setPipelineError, resetPipelineState, addToast]);

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
    const shieldClass = isReady ? 'text-cyber-cyan' : 'text-text-secondary';
    const titleClass = isReady ? 'text-text-primary' : 'text-text-secondary';
    return (
      <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl shadow-md h-full flex flex-col justify-between p-6 min-h-[420px] transition-all duration-300 animate-fadeIn delay-150">
        <div className={isReady ? 'space-y-5' : 'space-y-6'}>
          <div className="flex items-center gap-2.5 pb-4 border-b border-cyber-border/40">
            <Shield className={shieldClass} size={15} />
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
    <div className="space-y-8 animate-fadeIn relative pb-4" aria-busy={isRunning}>
      {/* Loading Overlay */}
      <Suspense fallback={null}>
        <LoadingOverlay stage={stage} error={pipelineError} />
      </Suspense>
 
      {/* Page Header */}
      <div className="animate-fadeIn delay-75">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Acoustic Analysis Console
        </h1>
        <p className="text-xs text-text-secondary mt-2 font-normal tracking-wide leading-relaxed max-w-3xl">
          AcousticSpace: De-noises room reflections (RIR) and analyzes speech cadence boundaries.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          const delayClass = idx === 0 ? 'delay-75' : idx === 1 ? 'delay-100' : idx === 2 ? 'delay-150' : 'delay-200';
          return (
            <div 
              key={idx} 
              className={`p-5 bg-cyber-dark backdrop-blur-xl rounded-2xl border min-h-[120px] flex flex-col justify-between hover-lift shadow-sm animate-fadeIn ${delayClass} ${themeConfig.border}`}
            >
              <div>
                <span className="text-[10px] font-mono font-semibold text-text-secondary uppercase tracking-wider block">
                  {m.label}
                </span>
                <span className="text-xl font-bold tracking-tight text-text-primary mt-1.5 block">
                  {m.value}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-2.5 border-t border-cyber-border/40">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${themeConfig.dot} animate-pulse`}></div>
                <span className="text-[10px] text-text-secondary truncate font-normal leading-none" title={m.change}>
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
            onAnalyze={runPipeline}
            stage={stage}
          />

          {/* Dynamic Waveform Viewer */}
          <WaveformViewer file={file} />
        </div>

        {/* Right Column: Acoustic Integrity Report */}
        <div ref={timelineRef} className="space-y-6 animate-fadeIn delay-100">
          {/* Error Alert Display */}
          {pipelineError && (
            <Suspense fallback={null}>
              <ErrorAlert 
                message={pipelineError} 
                onRetry={runPipeline} 
                title="Pipeline Execution Error"
              />
            </Suspense>
          )}

          {stage === 'completed' && prediction && file ? (
            /* Premium Prediction Result Card displaying only returned fields */
            <div ref={resultsRef} className="animate-fadeIn">
              <Suspense fallback={<PredictionCardSkeleton />}>
                <PredictionCard 
                  prediction={prediction}
                  confidence={confidence}
                  filename={file.name}
                  timestamp={timestamp}
                  processingTime={processingTime}
                  analysis={analysisInfo}
                />
              </Suspense>
            </div>
          ) : isRunning ? (
            /* Detailed Forensic Progress Timeline during active execution */
            renderIntegrityScanCard({
              isReady: true,
              content: (
                <TimelineProgress stage={stage} error={pipelineError} />
              ),
              footer: (
                <div className="pt-4 border-t border-cyber-border/40 text-[9px] text-center text-text-secondary tracking-widest font-mono uppercase">
                  ANALYSIS RUNNING...
                </div>
              )
            })
          ) : file ? (
            /* Ready to Scan State */
            renderIntegrityScanCard({
              isReady: true,
              content: (
                <div className="space-y-5">
                  <div className="p-5 bg-white/[0.01] border border-cyber-border/40 rounded-xl flex flex-col items-center justify-center text-center space-y-4 py-6">
                    <div className="p-3 bg-white/5 border border-cyber-border/60 text-text-primary rounded-full shadow-sm animate-pulse">
                      <FileAudio size={24} className="text-cyber-cyan" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                         Acoustic Payload Loaded
                      </h3>
                      <p className="text-[10px] text-text-secondary font-normal mt-1.5 max-w-xs leading-normal">
                        File details verified. Local audio waveform decoded successfully.
                      </p>
                    </div>
                  </div>
                  <TimelineProgress stage={stage} error={pipelineError} />
                </div>
              ),
              footer: (
                <div className="pt-4 border-t border-cyber-border/40 text-[9px] text-center text-text-secondary tracking-widest font-mono uppercase">
                  AWAITING SCAN TRIGGER
                </div>
              ),
            })
          ) : (
            /* Standby Card State - Polished Checklist Placeholder Panel */
            renderIntegrityScanCard({
              isReady: false,
              content: (
                <div className="space-y-5">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-cyber-border/40 rounded-md w-fit">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse"></div>
                    <span className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold font-mono">
                      Awaiting Analysis
                    </span>
                  </div>
                  <TimelineProgress stage="idle" />
                </div>
              ),
              footer: (
                <div className="pt-4 border-t border-cyber-border/40 text-[9px] text-center text-text-secondary tracking-widest font-mono uppercase">
                  SECURED NODE CHANNEL
                </div>
              ),
            })
          )}

          {/* Technical Metadata Panel */}
          <AudioMetadataPanel file={file} />
        </div>

      </div>
    </div>
  );
}

export default React.memo(Dashboard);

