import React, { useEffect, useState } from 'react';
import { 
  FileAudio, 
  Info, 
  Shield
} from 'lucide-react';
import AudioUpload from '../components/AudioUpload';
import WaveformViewer from '../components/WaveformViewer';
import { useFileUpload } from '../hooks/useFileUpload';
import { uploadAudio, analyzeAudio, predictAudio } from '../services/api';
import { API_BASE_URL } from '../config/apiConfig';

export default function Dashboard() {
  const fileUpload = useFileUpload();
  const { file, error, handleFileChange, removeFile, setError } = fileUpload;
  const [scannerOnline, setScannerOnline] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(true);
  const [pipelineMessage, setPipelineMessage] = useState('Awaiting Audio Upload');
  const [uploading, setUploading] = useState(false);

  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [_acousticFeatures, setAcousticFeatures] = useState(null);
  const [rirFeatures, setRirFeatures] = useState(null);
  const [breathingAnalysis, setBreathingAnalysis] = useState(null);

  // Ping backend to check status
  useEffect(() => {
    let cancelled = false;
    async function ping() {
      setScannerLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
        if (!res.ok) throw new Error(`Root ping failed: ${res.status}`);
        if (!cancelled) setScannerOnline(true);
      } catch {
        if (!cancelled) setScannerOnline(false);
      } finally {
        if (!cancelled) setScannerLoading(false);
      }
    }
    ping();
    return () => {
      cancelled = true;
    };
  }, []);

  // Trigger backend upload, analysis, and prediction pipeline when a valid file is selected
  useEffect(() => {
    if (!file) {
      setPrediction(null);
      setConfidence(null);
      setAcousticFeatures(null);
      setRirFeatures(null);
      setBreathingAnalysis(null);
      setPipelineMessage('Awaiting Audio Upload');
      return;
    }

    let active = true;
    const runPipeline = async () => {
      setUploading(true);
      setPipelineMessage('Uploading audio to gateway...');
      setPrediction(null);
      setConfidence(null);
      setAcousticFeatures(null);
      setRirFeatures(null);
      setBreathingAnalysis(null);

      try {
        // Step 1: Upload the file
        const uploadResult = await uploadAudio(file);
        if (!active) return;

        const { file_path } = uploadResult;
        setPipelineMessage('De-noising RIR reflections & extracting features...');

        // Step 2: Extract acoustic & RIR features
        const analysisResult = await analyzeAudio(file_path);
        if (!active) return;

        setAcousticFeatures(analysisResult.features);
        setRirFeatures(analysisResult.rir_features);
        setBreathingAnalysis(analysisResult.breathing_analysis);

        setPipelineMessage('Running AST classifier prediction...');

        // Step 3: Classify Deepfake vs Real
        const predictionResult = await predictAudio(file_path);
        if (!active) return;

        setPrediction(predictionResult.prediction);
        setConfidence(predictionResult.confidence);
        setPipelineMessage('Scan completed successfully.');
      } catch (err) {
        console.error('Scan pipeline failure:', err);
        if (active) {
          setPipelineMessage('Scan failed.');
          // Pass the error message to the upload component so it shows up in the warning banner
          setError(err.message || 'An unexpected error occurred during processing.');
        }
      } finally {
        if (active) {
          setUploading(false);
        }
      }
    };

    runPipeline();

    return () => {
      active = false;
    };
  }, [file, setError]);



  const scannerValue = scannerLoading ? 'Checking...' : scannerOnline ? 'Online' : 'Offline';
  const scannerChange = scannerLoading
    ? 'Probing backend'
    : scannerOnline
      ? 'API reachable'
      : 'Awaiting backend';

  // Derived metrics for UI meters
  const rirCoherence = rirFeatures
    ? Math.min(100, Math.max(0, Math.round((1 - Math.min(1, rirFeatures.background_noise_rms)) * 100)))
    : null;

  const respiratoryCoherence = breathingAnalysis
    ? Math.min(100, Math.max(0, Math.round((Math.max(0.1, 20 - Math.abs(12 - breathingAnalysis.breathing_rate)) / 20) * 100)))
    : null;

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
          { label: 'Pipeline State', value: uploading ? 'SCANNING' : fileUpload.file ? 'COMPLETED' : 'STANDBY', change: pipelineMessage, theme: uploading ? 'cyan' : fileUpload.file ? 'green' : 'gray' },
          { label: 'Verification', value: prediction ? prediction.toUpperCase() : '—', change: prediction ? `Confidence: ${(confidence * 100).toFixed(1)}%` : 'Awaiting classification', theme: prediction === 'Real' ? 'green' : prediction === 'Fake' ? 'rose' : 'gray' },
          { label: 'Classification F1', value: '98.4%', change: 'AST-v2 model spec', theme: 'cyan' },
          { label: 'Scanner Status', value: scannerValue, change: scannerChange, theme: scannerOnline ? 'cyan' : 'amber' }
        ].map((m, idx) => (
          <div 
            key={idx} 
            className="p-6 bg-cyber-dark rounded-xl border border-cyber-border transition-all hover:border-cyber-cyan/10"
          >
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest block">
              {m.label}
            </span>
            <span className="text-2xl font-display font-bold text-slate-100 mt-2 block">
              {m.value}
            </span>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                m.theme === 'amber' ? 'bg-amber-500' : m.theme === 'cyan' ? 'bg-cyber-cyan' : m.theme === 'green' ? 'bg-cyber-green' : m.theme === 'rose' ? 'bg-cyber-rose' : 'bg-slate-600'
              }`}></div>
              <span className="text-[11px] font-mono text-slate-400">
                {m.change}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Main Grid: Upload & Waveform (Left), Report Status (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Upload Dropzone & Waveform visualizer */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Audio Upload Portal */}
          <AudioUpload 
            file={file}
            error={error}
            handleFileChange={handleFileChange}
            removeFile={removeFile}
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
              <div className={`flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg transition-all duration-300 ${
                prediction === 'Real' 
                  ? 'border-cyber-green/30 bg-cyber-green-glow/5' 
                  : prediction === 'Fake' 
                    ? 'border-cyber-rose/30 bg-cyber-rose-glow/5' 
                    : 'border-slate-800 bg-slate-950/20'
              }`}>
                <div className={`p-3 border rounded-lg mb-4 transition-all duration-300 ${
                  prediction === 'Real' 
                    ? 'bg-cyber-green-glow/20 border-cyber-green/30 text-cyber-green' 
                    : prediction === 'Fake' 
                      ? 'bg-cyber-rose-glow/20 border-cyber-rose/30 text-cyber-rose' 
                      : 'bg-slate-950 border-cyber-border/40 text-slate-500'
                }`}>
                  <FileAudio size={32} className={uploading ? 'animate-bounce' : ''} />
                </div>
                
                <h3 className={`font-semibold text-sm uppercase tracking-wider font-mono ${
                  prediction === 'Real' 
                    ? 'text-cyber-green' 
                    : prediction === 'Fake' 
                      ? 'text-cyber-rose' 
                      : 'text-slate-400'
                }`}>
                  {uploading 
                    ? 'Scan In Progress' 
                    : prediction 
                      ? `Classification: ${prediction}` 
                      : 'Scan Pipeline Ready'}
                </h3>
                
                <p className="text-xs text-slate-400 max-w-[200px] mt-2 leading-relaxed">
                  {uploading
                    ? 'Decoding spatial indicators and processing model weights...'
                    : prediction
                      ? `Target audio classified as ${prediction.toUpperCase()} with a probability confidence of ${(confidence * 100).toFixed(1)}%.`
                      : 'Provide an audio file to run Room Impulse Response reflections analysis.'}
                </p>
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
                      className="h-full bg-cyber-cyan transition-all duration-500 rounded-full" 
                      style={{ width: `${rirCoherence ?? 0}%` }}
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
                      className="h-full bg-cyber-green transition-all duration-500 rounded-full" 
                      style={{ width: `${respiratoryCoherence ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Additional Detailed Extracted Parameters */}
                {rirFeatures && (
                  <div className="pt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono border-t border-cyber-border/20 mt-2 text-slate-500">
                    <div>
                      <span>RT60 Delay: </span>
                      <span className="text-slate-300">
                        {rirFeatures.rt60?.rt60_seconds ? `${rirFeatures.rt60.rt60_seconds.toFixed(2)}s` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span>Pauses: </span>
                      <span className="text-slate-300">
                        {breathingAnalysis?.pause_count ?? 0} times
                      </span>
                    </div>
                    <div>
                      <span>Background: </span>
                      <span className="text-slate-300 truncate block">
                        {(rirFeatures.background_noise_rms * 100).toFixed(2)}% RMS
                      </span>
                    </div>
                    <div>
                      <span>Resp. Rate: </span>
                      <span className="text-slate-300">
                        {breathingAnalysis?.breathing_rate ? `${breathingAnalysis.breathing_rate}/min` : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Footer */}
              <div className="mt-8 pt-4 border-t border-cyber-border text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>AST CLASSIFIER MODEL</span>
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
