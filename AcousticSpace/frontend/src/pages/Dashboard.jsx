import React, { useEffect, useState, useRef } from 'react';
import { 
  FileAudio, 
  Info, 
  Shield,
  ShieldAlert
} from 'lucide-react';
import AudioUpload from '../components/AudioUpload';
import WaveformViewer from '../components/WaveformViewer';
import { useFileUpload } from '../hooks/useFileUpload';
import { uploadAudio, analyzeAudio, predictAudio } from '../services/api';

export default function Dashboard({ apiStatus = 'checking' }) {
  const fileUpload = useFileUpload();
  const { file, error, handleFileChange, removeFile, setError } = fileUpload;
  const [pipelineMessage, setPipelineMessage] = useState('Awaiting Audio Upload');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileId, setFileId] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [rirFeatures, setRirFeatures] = useState(null);
  const [breathingAnalysis, setBreathingAnalysis] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);

  const apiStatusRef = useRef(apiStatus);
  useEffect(() => {
    apiStatusRef.current = apiStatus;
  }, [apiStatus]);

  const handleRetry = () => {
    setRetryKey(prev => prev + 1);
  };

  // Trigger backend upload and analysis pipeline when a valid file is selected
  useEffect(() => {
    if (!file) {
      setPrediction(null);
      setConfidence(null);
      setRirFeatures(null);
      setBreathingAnalysis(null);
      setFileId(null);
      setProcessingTime(null);
      setUploading(false);
      setAnalyzing(false);
      setPipelineMessage('Awaiting Audio Upload');
      return;
    }

    let active = true;
    const abortController = new AbortController();

    const runPipeline = async () => {
      setUploading(true);
      setError(null); // Clear previous error state immediately
      setPipelineMessage('Uploading audio to gateway...');
      setPrediction(null);
      setConfidence(null);
      setRirFeatures(null);
      setBreathingAnalysis(null);
      setFileId(null);
      setProcessingTime(null);

      try {
        // Step 1: Upload the file
        let uploadResult;
        try {
          uploadResult = await uploadAudio(file, abortController.signal);
        } catch (uploadErr) {
          if (uploadErr.name === 'AbortError') throw uploadErr;
          throw new Error(`Upload failed: ${uploadErr.message || 'Unknown network error'}`);
        }
        
        if (!active) return;

        // Perform payload schema validation for upload result
        if (!uploadResult || typeof uploadResult !== 'object') {
          throw new Error('Upload failed: Server returned an invalid response.');
        }
        const fileIdVal = uploadResult.file_path || uploadResult.file_name || uploadResult.file_id;
        if (!fileIdVal) {
          throw new Error('Upload failed: Server response is missing file identification metadata.');
        }

        setFileId(fileIdVal);
        setUploading(false);

        // Step 2: Trigger analysis & prediction
        setAnalyzing(true);
        setPipelineMessage('Decoding spatial indicators...');

        const startTime = performance.now();

        let analysisRes;
        let predictRes;

        const results = await Promise.all([
          analyzeAudio(fileIdVal, abortController.signal).catch(err => {
            if (err.name === 'AbortError') throw err;
            throw new Error(`Analysis failed: ${err.message}`);
          }),
          predictAudio(fileIdVal, abortController.signal).catch(err => {
            if (err.name === 'AbortError') throw err;
            throw new Error(`Prediction failed: ${err.message}`);
          })
        ]);
        analysisRes = results[0];
        predictRes = results[1];

        // Perform payload schema validation for analysis and prediction results
        if (!analysisRes || typeof analysisRes !== 'object') {
          throw new Error('Analysis failed: Server returned an empty or invalid response.');
        }
        if (!analysisRes.rir_features) {
          throw new Error('Analysis failed: Server response is missing Room Impulse Response metrics.');
        }
        if (!analysisRes.breathing_analysis) {
          throw new Error('Analysis failed: Server response is missing breathing analysis metrics.');
        }

        if (!predictRes || typeof predictRes !== 'object') {
          throw new Error('Prediction failed: Server returned an empty or invalid response.');
        }
        if (!predictRes.prediction) {
          throw new Error('Prediction failed: Server response is missing prediction classification.');
        }

        const endTime = performance.now();
        const elapsedSecs = ((endTime - startTime) / 1000).toFixed(2);

        if (!active) return;

        // Store returned objects in Dashboard state
        setPrediction(predictRes.prediction);
        setConfidence(
          typeof predictRes.confidence === 'number'
            ? (predictRes.confidence > 1 ? predictRes.confidence / 100 : predictRes.confidence)
            : null
        );
        setRirFeatures(analysisRes.rir_features);
        setBreathingAnalysis(analysisRes.breathing_analysis);
        setProcessingTime(elapsedSecs);

        setPipelineMessage(`Analysis completed in ${elapsedSecs}s.`);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Pipeline request aborted.');
          return;
        }
        console.error('Scan pipeline failure:', err);
        if (active) {
          setPipelineMessage('Scan pipeline failed.');
          
          let readableMessage = err.message || 'An unexpected error occurred during processing.';
          if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('network error') || err.message.includes('Failed to upload'))) {
            if (apiStatusRef.current === 'offline') {
              readableMessage = 'API Gateway is offline. Please make sure the backend is running and online.';
            } else {
              readableMessage = 'Network connection failed. Please check your network connectivity and try again.';
            }
          }
          setError(readableMessage);
        }
      } finally {
        if (active) {
          setUploading(false);
          setAnalyzing(false);
        }
      }
    };

    runPipeline();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [file, retryKey, setError]);

  const scannerValue = apiStatus === 'checking' ? 'Checking...' : apiStatus === 'online' ? 'Online' : 'Offline';
  const scannerChange = apiStatus === 'checking'
    ? 'Probing backend'
    : apiStatus === 'online'
      ? 'API reachable'
      : 'Awaiting backend';

  // Derived metrics for UI meters
  const rirCoherence = rirFeatures && typeof rirFeatures.background_noise_rms === 'number'
    ? Math.min(100, Math.max(0, Math.round((1 - Math.min(1, rirFeatures.background_noise_rms)) * 100)))
    : null;

  const respiratoryCoherence = breathingAnalysis && typeof breathingAnalysis.breathing_rate === 'number'
    ? Math.min(100, Math.max(0, Math.round((Math.max(0.1, 20 - Math.abs(12 - breathingAnalysis.breathing_rate)) / 20) * 100)))
    : null;

  const pipelineStateValue = error && !uploading && !analyzing
    ? 'FAILED'
    : uploading
      ? 'UPLOADING'
      : analyzing
        ? 'ANALYZING'
        : prediction
          ? 'ANALYZED'
          : fileId
            ? 'UPLOADED'
            : 'STANDBY';

  const pipelineStateTheme = error && !uploading && !analyzing
    ? 'rose'
    : uploading || analyzing
      ? 'cyan'
      : prediction
        ? 'green'
        : 'gray';

  return (
    <div className="space-y-8 animate-fadeIn">
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
          { label: 'Pipeline State', value: pipelineStateValue, change: pipelineMessage, theme: pipelineStateTheme },
          { label: 'Verification', value: prediction ? prediction.toUpperCase() : '—', change: (prediction && typeof confidence === 'number') ? `Confidence: ${(confidence * 100).toFixed(1)}%` : 'Awaiting classification', theme: prediction === 'Real' ? 'green' : prediction === 'Fake' ? 'rose' : 'gray' },
          { label: 'Classification F1', value: '98.4%', change: 'AST-v2 model spec', theme: 'cyan' },
          { label: 'Scanner Status', value: scannerValue, change: scannerChange, theme: apiStatus === 'online' ? 'cyan' : apiStatus === 'checking' ? 'amber' : 'rose' }
        ].map((m, idx) => (
          <div 
            key={idx} 
            className={`p-6 bg-cyber-dark rounded-xl border transition-all duration-300 min-h-[128px] flex flex-col justify-between ${
              m.theme === 'amber' 
                ? 'border-cyber-border hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                : m.theme === 'cyan' 
                  ? 'border-cyber-border hover:border-cyber-cyan/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                  : m.theme === 'green' 
                    ? 'border-cyber-border hover:border-cyber-green/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                    : m.theme === 'rose' 
                      ? 'border-cyber-border hover:border-cyber-rose/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.05)]' 
                      : 'border-cyber-border hover:border-slate-700/30'
            }`}
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
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                m.theme === 'amber' ? 'bg-amber-500' : m.theme === 'cyan' ? 'bg-cyber-cyan' : m.theme === 'green' ? 'bg-cyber-green' : m.theme === 'rose' ? 'bg-cyber-rose' : 'bg-slate-600'
              }`}></div>
              <span className="text-[11px] font-mono text-slate-400 truncate" title={m.change}>
                {m.change}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Main Grid: Upload & Waveform (Left), Report Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload Dropzone & Waveform visualizer */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Audio Upload Portal */}
          <AudioUpload 
            file={file}
            error={error}
            handleFileChange={handleFileChange}
            removeFile={removeFile}
            uploading={uploading || analyzing}
            fileId={fileId}
            handleRetry={handleRetry}
          />

          {/* Dynamic Waveform Visualizer */}
          <WaveformViewer file={file} />
        </div>

        {/* Right Column: Acoustic Integrity Report */}
        <div className="space-y-8">
          <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-cyber-border flex items-center gap-2">
              <Shield className="text-cyber-cyan" size={18} />
              <h2 className="font-display font-semibold text-slate-200">
                Acoustic Integrity Report
              </h2>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between min-h-[400px]">
              
              {/* Scanner Interface Output */}
              <div className={`relative overflow-hidden flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg transition-all duration-300 ${
                prediction === 'Real' 
                  ? 'border-cyber-green/30 bg-cyber-green-glow/5' 
                  : prediction === 'Fake' 
                    ? 'border-cyber-rose/30 bg-cyber-rose-glow/5' 
                    : error && !uploading && !analyzing
                      ? 'border-cyber-rose/30 bg-cyber-rose-glow/5'
                      : 'border-slate-800 bg-slate-950/20'
              }`}>
                {(uploading || analyzing) && (
                  <div className="scanner-line"></div>
                )}
                
                <div className={`p-3 border rounded-lg mb-4 transition-all duration-300 z-10 ${
                  prediction === 'Real' 
                    ? 'bg-cyber-green-glow/20 border-cyber-green/30 text-cyber-green' 
                    : prediction === 'Fake' 
                      ? 'bg-cyber-rose-glow/20 border-cyber-rose/30 text-cyber-rose' 
                      : error && !uploading && !analyzing
                        ? 'bg-cyber-rose-glow/20 border-cyber-rose/30 text-cyber-rose'
                        : 'bg-slate-950 border-cyber-border/40 text-slate-500'
                }`}>
                  {error && !uploading && !analyzing ? (
                    <ShieldAlert size={32} />
                  ) : (
                    <FileAudio size={32} className={(uploading || analyzing) ? 'animate-bounce' : ''} />
                  )}
                </div>
                
                <h3 className={`font-semibold text-sm uppercase tracking-wider font-mono z-10 ${
                  prediction === 'Real' 
                    ? 'text-cyber-green' 
                    : prediction === 'Fake' 
                      ? 'text-cyber-rose' 
                      : error && !uploading && !analyzing
                        ? 'text-cyber-rose'
                        : 'text-slate-400'
                }`}>
                  {error && !uploading && !analyzing
                    ? 'Scan Failed'
                    : uploading
                      ? 'Uploading audio...' 
                      : analyzing
                        ? 'Analyzing cadence...'
                        : prediction 
                          ? `Classification: ${prediction}` 
                          : 'Scan Pipeline Ready'}
                </h3>
                
                <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed z-10">
                  {error && !uploading && !analyzing
                    ? error
                    : uploading
                      ? 'Uploading audio to gateway...'
                      : analyzing
                        ? 'Decoding spatial indicators and processing model weights...'
                        : prediction
                          ? `Target audio classified as ${prediction.toUpperCase()} with a probability confidence of ${(typeof confidence === 'number' ? (confidence * 100).toFixed(1) : '—')}%.`
                          : 'Provide an audio file to run Room Impulse Response reflections analysis.'}
                </p>

                {error && !uploading && !analyzing && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-4 px-4 py-2 rounded-lg bg-cyber-rose/20 hover:bg-cyber-rose/30 border border-cyber-rose/30 hover:border-cyber-rose/50 text-slate-200 font-mono text-xs font-bold transition-all cursor-pointer uppercase tracking-wider z-10"
                  >
                    Retry Scan
                  </button>
                )}

                {/* Progress Pipeline Steps */}
                {(uploading || analyzing || prediction || (error && file)) && (
                  <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-mono z-10 animate-fadeIn">
                    {/* Step 1: Upload */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        (prediction || analyzing || (error && fileId))
                          ? 'bg-cyber-green shadow-[0_0_8px_var(--color-cyber-green)]'
                          : uploading
                            ? 'bg-cyber-cyan animate-pulse shadow-[0_0_8px_var(--color-cyber-cyan)]'
                            : (error && !fileId)
                              ? 'bg-cyber-rose shadow-[0_0_8px_var(--color-cyber-rose)]'
                              : 'bg-slate-700'
                      }`} />
                      <span className={
                        (prediction || analyzing || (error && fileId))
                          ? 'text-cyber-green font-semibold'
                          : uploading
                            ? 'text-cyber-cyan font-semibold animate-pulse'
                            : (error && !fileId)
                              ? 'text-cyber-rose font-semibold'
                              : 'text-slate-500'
                      }>
                        UPLOAD
                      </span>
                    </div>

                    <div className="h-[1px] w-4 bg-slate-800" />

                    {/* Step 2: Analysis */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        prediction
                          ? 'bg-cyber-green shadow-[0_0_8px_var(--color-cyber-green)]'
                          : analyzing
                            ? 'bg-cyber-cyan animate-pulse shadow-[0_0_8px_var(--color-cyber-cyan)]'
                            : (error && fileId)
                              ? 'bg-cyber-rose shadow-[0_0_8px_var(--color-cyber-rose)]'
                              : 'bg-slate-700'
                      }`} />
                      <span className={
                        prediction
                          ? 'text-cyber-green font-semibold'
                          : analyzing
                            ? 'text-cyber-cyan font-semibold animate-pulse'
                            : (error && fileId)
                              ? 'text-cyber-rose font-semibold'
                              : 'text-slate-500'
                      }>
                        ANALYSIS
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Diagnostic Scores Meters */}
              <div className="space-y-4 pt-6 border-t border-cyber-border/40 mt-6">
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <Info size={12} />
                  <span>Diagnostic Parameters</span>
                </div>
                
                {/* Metric Item 1: RIR Echo Coherence */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>RIR Echo Wall Coherence</span>
                    <span className="text-slate-200">
                      {rirCoherence !== null ? `${rirCoherence}%` : '— %'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        uploading || analyzing 
                          ? 'bg-cyber-cyan/40 animate-pulse w-full' 
                          : 'bg-cyber-cyan'
                      }`} 
                      style={{ width: uploading || analyzing ? '100%' : `${rirCoherence ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Metric Item 2: Respiratory Coherence */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Respiratory Coherence</span>
                    <span className="text-slate-200">
                      {respiratoryCoherence !== null ? `${respiratoryCoherence}%` : '— %'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        uploading || analyzing 
                          ? 'bg-cyber-green/40 animate-pulse w-full' 
                          : 'bg-cyber-green'
                      }`} 
                      style={{ width: uploading || analyzing ? '100%' : `${respiratoryCoherence ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Additional Detailed Extracted Parameters */}
                <div className="pt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono border-t border-cyber-border/20 mt-2 text-slate-500">
                  <div>
                    <span>RT60 Delay: </span>
                    <span className="text-slate-300">
                      {typeof rirFeatures?.rt60?.rt60_seconds === 'number' ? `${rirFeatures.rt60.rt60_seconds.toFixed(2)}s` : '—'}
                    </span>
                  </div>
                  <div>
                    <span>Pauses: </span>
                    <span className="text-slate-300">
                      {typeof breathingAnalysis?.pause_count === 'number' ? `${breathingAnalysis.pause_count} times` : '—'}
                    </span>
                  </div>
                  <div>
                    <span>Background: </span>
                    <span className="text-slate-300 truncate block">
                      {typeof rirFeatures?.background_noise_rms === 'number' ? `${(rirFeatures.background_noise_rms * 100).toFixed(2)}% RMS` : '—'}
                    </span>
                  </div>
                  <div>
                    <span>Resp. Rate: </span>
                    <span className="text-slate-300">
                      {typeof breathingAnalysis?.breathing_rate === 'number' ? `${breathingAnalysis.breathing_rate}/min` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-8 pt-4 border-t border-cyber-border text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>
                  {processingTime ? `PROC TIME: ${processingTime}s` : 'AST CLASSIFIER MODEL'}
                </span>
                <span className={`font-semibold ${prediction ? 'text-cyber-green' : 'text-slate-500'}`}>
                  {prediction ? 'ANALYZED' : 'READY'}
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
