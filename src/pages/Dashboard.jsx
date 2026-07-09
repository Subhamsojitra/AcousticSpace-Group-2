import React from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  Activity, 
  Info, 
  Shield 
} from 'lucide-react';

export default function Dashboard() {
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
          
          {/* Static Audio Upload Card */}
          <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden">
            <div className="p-6 border-b border-cyber-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="text-cyber-cyan" size={18} />
                <h2 className="font-display font-semibold text-slate-200">
                  Audio Upload Portal
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                File Vault Gateway
              </span>
            </div>

            <div className="p-8">
              {/* Drag and Drop Box */}
              <div className="border border-dashed border-slate-700/60 rounded-xl bg-slate-950/30 p-10 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-cyber-cyan/40 hover:bg-slate-950/50 transition-all duration-300">
                <div className="p-4 rounded-full bg-cyber-cyan-glow text-cyber-cyan border border-cyber-cyan/10 mb-4 group-hover:scale-105 transition-transform duration-300">
                  <UploadCloud size={32} />
                </div>
                <h3 className="font-display font-semibold text-slate-200 text-sm">
                  Drag and drop audio file here
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
                  or browse your local filesystem
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono border border-cyber-border bg-slate-950/80 px-2 py-1 rounded">
                  <span>WAV, MP3 formats</span>
                  <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                  <span>Max 15MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Static Waveform Visualizer Placeholder */}
          <div className="bg-cyber-dark rounded-xl border border-cyber-border overflow-hidden">
            <div className="p-6 border-b border-cyber-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="text-cyber-cyan" size={18} />
                <h2 className="font-display font-semibold text-slate-200">
                  Spectral Waveform Analyzer
                </h2>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                STANDBY
              </span>
            </div>

            <div className="p-8 bg-slate-950/50 relative overflow-hidden flex items-center justify-center min-h-[160px]">
              {/* Static Waveform Mock (Muted Mapped Bars) */}
              <svg className="w-full h-32 text-slate-800/25" viewBox="0 0 400 100" preserveAspectRatio="none">
                {[...Array(60)].map((_, i) => {
                  const x = 5 + i * 6.5;
                  const height = 15 + Math.sin(x * 0.05) * 8; // Muted flat waveform
                  const y = 50 - height / 2;
                  
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width="3"
                      height={height}
                      rx="1.5"
                      className="fill-slate-800/40"
                    />
                  );
                })}
              </svg>

              {/* Watermark Centered Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border border-slate-800 bg-slate-950 px-3 py-1.5 rounded">
                  Awaiting Audio Upload
                </p>
              </div>
            </div>
          </div>

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
