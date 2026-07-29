import React, { useState } from 'react';
import { 
  FileAudio, 
  Settings, 
  Activity, 
  Mic, 
  Cpu, 
  TrendingUp, 
  ShieldCheck, 
  ArrowDown, 
  Info,
  ChevronRight
} from 'lucide-react';

const PIPELINE_NODES = [
  {
    id: 1,
    title: 'Audio Gateway Upload',
    desc: 'Audio payload (WAV, MP3, FLAC) is transmitted to the secured backend API gateway. File headers are checked for safety.',
    icon: FileAudio,
    details: 'Validates file size (max 15MB) and processes initial upload metadata.'
  },
  {
    id: 2,
    title: 'Librosa Signal Processing',
    desc: 'Decodes the binary audio stream client-side or server-side. Normalizes sample rate to 16kHz and extracts spectrogram matrices.',
    icon: Settings,
    details: 'Converts raw audio wave amplitude vectors into discrete Log-Mel Spectrogram tiles.'
  },
  {
    id: 3,
    title: 'RIR Reflective Isolation',
    desc: 'Analyzes spatial acoustics and room reverberations. Calculates the RT60 index to filter background echo signatures.',
    icon: Activity,
    details: 'Isolates echo profiles to distinguish organic vocal cadence from synthesized acoustics.'
  },
  {
    id: 4,
    title: 'Voice Cadence Boundary Analysis',
    desc: 'Traces voiced speech structures and silent pauses. Maps breathing indicators to look for unnatural speech cadence overlaps.',
    icon: Mic,
    details: 'Calculates pause interval histograms to look for splicing transitions.'
  },
  {
    id: 5,
    title: 'Audio Spectrogram Transformer (AST)',
    desc: 'Log-Mel Spectrogram inputs are mapped to 16x16 patch embeddings. Feeds self-attention layers to map speech cadence signatures.',
    icon: Cpu,
    details: 'AST applies pre-trained Transformer weights to compute classification features.'
  },
  {
    id: 6,
    title: 'Probability Estimation',
    desc: 'The classification features map to a sigmoid prediction layer, producing an authentic score from 0.0 to 1.0.',
    icon: TrendingUp,
    details: 'Generates statistical likelihood percentages representing real or fake audio classes.'
  },
  {
    id: 7,
    title: 'Forensic Verdict Compiler',
    desc: 'Compiles prediction confidence, processing time, duration, and RIR features into a signed, human-readable console report.',
    icon: ShieldCheck,
    details: 'Displays final AUTHENTIC or SUSPICIOUS logs on the dashboard.'
  }
];

export default function PipelineInfo() {
  const [activeNode, setActiveNode] = useState(1);

  return (
    <div className="space-y-8 animate-fadeIn relative pb-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Inference Pipeline Architecture
        </h1>
        <p className="text-xs text-text-secondary mt-2 font-normal tracking-wide leading-relaxed">
          Interactive schematic detailing the 7 core nodes of the AcousticSpace signal preprocessing and transformer inference workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Vertical Interactive Timeline */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 shadow-md relative">
            
            <div className="space-y-4 relative pl-6">
              {/* Connector line */}
              <div className="absolute left-[9px] top-4 bottom-4 w-[1px] bg-cyber-border/40"></div>

              {PIPELINE_NODES.map((node) => {
                const Icon = node.icon;
                const isActive = activeNode === node.id;
                
                return (
                  <div
                    key={node.id}
                    onClick={() => setActiveNode(node.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/5 border-cyber-cyan/40 shadow-sm' 
                        : 'bg-white/[0.01] border-cyber-border/40 hover:bg-white/[0.015] hover:border-cyber-border/80'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 z-10">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[9px] font-bold ${
                        isActive 
                          ? 'bg-cyber-cyan text-black border-transparent' 
                          : 'bg-cyber-black text-text-secondary border-cyber-border/60'
                      }`}>
                        {node.id}
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-[10px] font-mono tracking-wider uppercase ${
                          isActive ? 'text-cyber-cyan font-bold' : 'text-text-primary'
                        }`}>
                          {node.title}
                        </h4>
                        <ChevronRight size={12} className={`text-text-secondary transition-all ${isActive ? 'rotate-90 text-cyber-cyan' : ''}`} />
                      </div>
                      <p className="text-[10px] text-text-secondary font-mono leading-normal">
                        {node.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Right Column: Node Details Panel */}
        <div className="xl:col-span-1">
          {(() => {
            const node = PIPELINE_NODES.find(n => n.id === activeNode) || PIPELINE_NODES[0];
            const NodeIcon = node.icon;
            
            return (
              <div className="bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl p-6 shadow-md space-y-6 animate-fadeIn sticky top-6">
                <div className="flex items-center justify-between pb-4 border-b border-cyber-border/40">
                  <div>
                    <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest block font-bold">
                      Node Details
                    </span>
                    <h3 className="text-xs font-mono font-bold uppercase text-cyber-cyan mt-1">
                      Node {node.id}: {node.title}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-cyber-cyan/5 border border-cyber-cyan/20 text-cyber-cyan rounded-lg">
                    <NodeIcon size={18} />
                  </div>
                </div>

                <div className="space-y-4 font-mono text-[11px]">
                  <div className="p-3.5 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-2">
                    <span className="text-[8px] text-text-secondary uppercase tracking-wider block font-bold">Description</span>
                    <p className="text-text-secondary leading-relaxed">
                      {node.desc}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.01] border border-cyber-border/40 rounded-xl space-y-2">
                    <span className="text-[8px] text-text-secondary uppercase tracking-wider block font-bold">Technical Operations</span>
                    <p className="text-text-primary leading-relaxed font-semibold">
                      {node.details}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-cyber-cyan/5 border border-cyber-cyan/10 text-cyber-cyan rounded-xl flex items-start gap-2.5">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p className="text-[9px] font-mono leading-normal uppercase">
                    This schematic represents the actual production signal pipeline implemented in the AcousticSpace neural framework.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
