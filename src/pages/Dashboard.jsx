import React from 'react';
import { 
  FileAudio, 
  Info, 
  Shield 
} from 'lucide-react';
import AudioUpload from '../components/AudioUpload';
import WaveformViewer from '../components/WaveformViewer';
import { useFileUpload } from '../hooks/useFileUpload';

export default function Dashboard() {
  const fileUpload = useFileUpload();

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
          { label: 'Total Analyses', value: '—', change: 'Offline mode', theme: 'gray' },
          { label: 'Deepfakes Flagged', value: '—', change: 'Offline mode', theme: 'gray' },
          { label: 'Classification F1', value: '98.4%', change: 'AST-v2 model spec', theme: 'cyan' },
          { label: 'Scanner Status', value: 'Offline', change: 'Awaiting backend', theme: 'amber' }
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
                m.theme === 'amber' ? 'bg-amber-500' : m.theme === 'cyan' ? 'bg-cyber-cyan' : 'bg-slate-600'
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
            file={fileUpload.file}
            error={fileUpload.error}
            handleFileChange={fileUpload.handleFileChange}
            removeFile={fileUpload.removeFile}
          />

          {/* Dynamic Waveform Visualizer */}
          <WaveformViewer file={fileUpload.file} />

        </div>

        {/* Right Column: Acoustic Integrity Report Placeholder */}
        <div className="space-y-8">
          
          <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-cyber-border flex items-center gap-2">
              <Shield className="text-cyber-cyan" size={18} />
              <h2 className="font-display font-semibold text-slate-200">
                Acoustic Integrity Report
              </h2>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between min-h-[400px]">
              
              {/* Standby Interface */}
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 bg-slate-950/20 rounded-lg">
                <div className="p-3 bg-slate-950 border border-cyber-border/40 text-slate-500 rounded-lg mb-4">
                  <FileAudio size={32} />
                </div>
                <h3 className="font-semibold text-slate-400 text-sm">Scan Pipeline Ready</h3>
                <p className="text-xs text-slate-500 max-w-[200px] mt-2 leading-relaxed">
                  Provide an audio file to run Room Impulse Response reflections analysis.
                </p>
              </div>

              {/* Muted Placeholder Metrics */}
              <div className="space-y-4 pt-6 border-t border-cyber-border/40 mt-6">
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <Info size={12} />
                  <span>Expected Diagnostic Scores</span>
                </div>
                
                {/* Metric Item 1 */}
                <div className="space-y-1.5 opacity-55">
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span>RIR Echo Wall Coherence</span>
                    <span>— %</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div className="h-full bg-slate-800 rounded-full w-0"></div>
                  </div>
                </div>

                {/* Metric Item 2 */}
                <div className="space-y-1.5 opacity-55">
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span>Respiratory Coherence</span>
                    <span>— %</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div className="h-full bg-slate-800 rounded-full w-0"></div>
                  </div>
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-8 pt-4 border-t border-cyber-border text-[10px] font-mono text-slate-600 flex items-center justify-between">
                <span>AST CLASSIFIER MODEL</span>
                <span className="text-slate-600 font-semibold">NOT LOADED</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
