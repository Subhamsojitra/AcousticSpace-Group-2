import React from 'react';
import { 
  Cpu, 
  Database, 
  Activity, 
  HelpCircle, 
  FileAudio, 
  CheckCircle, 
  Radio
} from 'lucide-react';

export default function ModelInfo({ apiStatus = 'checking', latency = null }) {
  const specs = [
    { name: 'Model Architecture', value: 'Audio Spectrogram Transformer (AST)' },
    { name: 'Feature Extractor', value: 'Log-Mel Spectrogram (Librosa)' },
    { name: 'Supported Audio Formats', value: 'WAV, MP3, FLAC' },
    { name: 'Spectrogram Backend', value: 'Librosa Preprocessing' },
    { name: 'Framework / Libraries', value: 'PyTorch / Hugging Face Transformers' },
    { name: 'Inference Pipeline', value: 'Upload → Feature Extraction → RIR Isolation → AST Prediction' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn relative pb-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Model Specifications & Node Diagnostics
        </h1>
        <p className="text-xs text-text-secondary mt-2 font-normal tracking-wide leading-relaxed">
          Technical ledger documenting the core neural classifier architecture, feature extractors, and live API diagnostics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns: Model specifications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-2 pb-4 border-b border-cyber-border/40 mb-6">
              <Cpu size={15} className="text-cyber-cyan" />
              <h3 className="font-display font-semibold text-xs tracking-wide uppercase text-text-primary">
                Acoustic Spectrogram Transformer Specs
              </h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {specs.map((spec, i) => (
                <div 
                  key={i} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl hover:bg-white/[0.015] transition-all"
                >
                  <span className="text-text-secondary uppercase text-[9px] tracking-wider font-semibold">
                    {spec.name}
                  </span>
                  <span className="text-text-primary font-bold text-right sm:max-w-md">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-cyber-border/40">
              <HelpCircle size={15} className="text-cyber-cyan" />
              <h3 className="font-display font-semibold text-xs tracking-wide uppercase text-text-primary">
                Model Implementation Specs
              </h3>
            </div>
            <div className="font-mono text-xs text-text-secondary leading-relaxed p-4 bg-white/[0.01] border border-cyber-border/40 rounded-xl">
              <span className="font-bold uppercase tracking-wider block mb-2 text-text-primary">
                MODEL COMPATIBILITY
              </span>
              Optimized for Audio Spectrogram Transformer (AST) models. Audio normalization pipelines normalise raw signal structures client-side to ensure compliance with transformer mono-channel inputs.
            </div>
          </div>
        </div>

        {/* Right Column: Live Connection Diagnostics */}
        <div className="space-y-6">
          <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 shadow-md flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 pb-4 border-b border-cyber-border/40 mb-6">
                <Activity size={15} className="text-cyber-cyan" />
                <h3 className="font-display font-semibold text-xs tracking-wide uppercase text-text-primary">
                  Live Diagnostics
                </h3>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-cyber-border/40 rounded-xl">
                  <span className="text-text-secondary uppercase text-[9px] tracking-wider">Gateway Connection</span>
                  <div className="flex items-center gap-2">
                    <Radio 
                      size={12} 
                      className={
                        apiStatus === 'online' 
                          ? 'text-cyber-green animate-pulse' 
                          : apiStatus === 'checking' 
                            ? 'text-cyber-cyan animate-pulse' 
                            : 'text-cyber-rose animate-pulse'
                      } 
                    />
                    <span className={`font-bold ${
                      apiStatus === 'online' 
                        ? 'text-cyber-green' 
                        : apiStatus === 'checking' 
                          ? 'text-cyber-cyan' 
                          : 'text-cyber-rose'
                    }`}>
                      {apiStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-cyber-border/40 rounded-xl">
                  <span className="text-text-secondary uppercase text-[9px] tracking-wider">Gateway Latency</span>
                  <span className="text-text-primary font-bold">
                    {latency !== null ? `${latency} ms` : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-cyber-border/40 rounded-xl">
                  <span className="text-text-secondary uppercase text-[9px] tracking-wider">Neural Classifier Spec</span>
                  <span className="text-text-primary font-bold">READY</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white/[0.01] border border-cyber-border/40 rounded-xl text-[9px] font-mono text-text-secondary leading-relaxed uppercase mt-6 text-center">
              Target port queries occur every 10 seconds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
