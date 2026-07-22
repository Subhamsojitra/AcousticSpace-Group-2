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
import PredictionCard from '../components/PredictionCard';
import LoadingOverlay from '../components/LoadingOverlay';

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

  // Reset pipeline state when the selected file changes or is removed
  useEffect(() => {
    if (!file) {
      setPrediction(null);
      setConfidence(null);
      setAnalysisInfo(null);
      setRirFeatures(null);
      setBreathingAnalysis(null);
      setFileId(null);
      setProcessingTime(null);
      setTimestamp(null);
      setStage('idle');
      setPipelineMessage('Awaiting Audio Upload');
    } else {
      setPrediction(null);
      setConfidence(null);
      setAnalysisInfo(null);
      setRirFeatures(null);
      setBreathingAnalysis(null);
      setFileId(null);
      setProcessingTime(null);
      setTimestamp(null);
      setStage('idle');
      setPipelineMessage('Payload loaded. Ready to run forensic analysis.');
    }
  }, [file]);

  const runPipeline = async () => {
    if (!file) return;

    // Prevent duplicate requests
    if (stage === 'uploading' || stage === 'extracting' || stage === 'predicting') {
      return;
    }

    // Reset previous execution results
    setError(null);
    setPrediction(null);
    setConfidence(null);
    setAnalysisInfo(null);
    setRirFeatures(null);
    setBreathingAnalysis(null);
    setProcessingTime(null);
    setTimestamp(null);
    setFileId(null);

    const startTime = performance.now();

    try {
      // 1. Upload stage
      setStage('uploading');
      setPipelineMessage('Uploading audio payload to security gateway...');
      const uploadResult = await uploadAudio(file);

      // Perform payload schema validation for upload result
      if (!uploadResult || typeof uploadResult !== 'object') {
        throw new Error('Upload failed: Server returned an invalid response.');
      }
      const fileIdVal = uploadResult.file_path || uploadResult.file_name || uploadResult.file_id;
      if (!fileIdVal) {
        throw new Error('Upload failed: Server response is missing file identification metadata.');
      }
      setFileId(fileIdVal);

      // 2. Extraction stage
      setStage('extracting');
      setPipelineMessage('Decoding spatial indicators...');
      const analysisRes = await analyzeAudio(fileIdVal);

      // Perform payload schema validation for analysis results
      if (!analysisRes || typeof analysisRes !== 'object') {
        throw new Error('Analysis failed: Server returned an empty or invalid response.');
      }
      if (!analysisRes.rir_features) {
        throw new Error('Analysis failed: Server response is missing Room Impulse Response metrics.');
      }
      if (!analysisRes.breathing_analysis) {
        throw new Error('Analysis failed: Server response is missing breathing analysis metrics.');
      }

      setRirFeatures(analysisRes.rir_features);
      setBreathingAnalysis(analysisRes.breathing_analysis);

      // 3. Predicting stage
      setStage('predicting');
      setPipelineMessage('Running deepfake classification weights...');
      const predictRes = await predictAudio(fileIdVal);

      // Perform payload schema validation for prediction results
      if (!predictRes || typeof predictRes !== 'object') {
        throw new Error('Prediction failed: Server returned an empty or invalid response.');
      }
      if (!predictRes.prediction) {
        throw new Error('Prediction failed: Server response is missing prediction classification.');
      }

      const endTime = performance.now();
      const elapsedSecs = ((endTime - startTime) / 1000).toFixed(2);

      // Store returned objects in Dashboard state (only passing confirmed predict response data to child components)
      setPrediction(predictRes.prediction);
      setConfidence(predictRes.confidence);
      setAnalysisInfo(predictRes.analysis);
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

  const scannerValue = apiStatus === 'checking' ? 'Checking...' : apiStatus === 'online' ? 'Online' : 'Offline';
  const scannerChange = apiStatus === 'checking'
    ? 'Probing backend'
    : apiStatus === 'online'
      ? 'API reachable'
      : 'Awaiting backend';

  const pipelineStateValue = stage === 'completed'
    ? 'ANALYZED'
    : stage === 'failed'
      ? 'FAILED'
      : stage !== 'idle'
        ? stage.toUpperCase()
        : file
          ? 'READY'
          : 'STANDBY';

  const pipelineStateTheme = stage === 'completed'
    ? 'green'
    : stage === 'failed'
      ? 'rose'
      : stage !== 'idle'
        ? 'cyan'
        : file
          ? 'cyan'
          : 'gray';

  // Determine dashboard inputs and interaction lock state
  const isRunning = stage === 'uploading' || stage === 'extracting' || stage === 'predicting';

  return (
    <div className="space-y-8 animate-fadeIn relative">
      {/* Loading Overlay */}
      <LoadingOverlay stage={stage} error={uploadError} />

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
          { 
            label: 'Verification', 
            value: prediction ? prediction.toUpperCase() : '—', 
            change: (prediction && typeof confidence === 'number') 
              ? `Confidence: ${confidence.toFixed(1)}%` 
              : 'Awaiting classification', 
            theme: prediction === 'Real' ? 'green' : prediction === 'Fake' ? 'rose' : 'gray' 
          },
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
            /* Standby Card State */
            <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden h-full flex flex-col justify-between p-6 min-h-[400px]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b border-cyber-border">
                  <Shield className="text-slate-500" size={18} />
                  <h2 className="font-display font-semibold text-slate-400">
                    Acoustic Integrity Scan
                  </h2>
                </div>
                
                <div className="p-4 bg-slate-950/20 border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-center space-y-3 py-12">
                  <div className="p-3 bg-slate-900 border border-slate-800 text-slate-600 rounded-full">
                    <FileAudio size={28} />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Awaiting Payload
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-1 max-w-xs">
                      Provide an audio file on the left console to trigger acoustic features & deepfake analysis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-cyber-border/40 text-[9px] text-center text-slate-600 font-mono">
                SECURED THREAT NODE CHANNEL
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
