import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Activity, Volume2, ShieldCheck, AlertTriangle } from "lucide-react";
import { generateAnalysisReport } from "../utils/reportGenerator";
import "./Results.css";

const Results = ({
  result: passedResult,
  onAnalyzeAnother,
  onDownloadReport,
  _isDemo = true
}) => {
  const navigate = useNavigate();

  const result = {
    prediction: passedResult?.prediction || "Real",
    confidence: passedResult?.confidence !== undefined && passedResult?.confidence !== null ? passedResult.confidence : 94,
    filename: passedResult?.filename || "sample_audio.wav",
    duration: passedResult?.duration !== undefined && passedResult?.duration !== null ? passedResult.duration : "5.2 sec",
    size: passedResult?.size !== undefined && passedResult?.size !== null ? passedResult.size : "1.8 MB",
    rirScore: passedResult?.rirScore !== undefined && passedResult?.rirScore !== null ? passedResult.rirScore : null,
    breathingScore: passedResult?.breathingScore !== undefined && passedResult?.breathingScore !== null ? passedResult.breathingScore : null,
    summary: passedResult?.summary || null
  };

  const isReal = typeof result.prediction === 'string' && result.prediction.trim().toLowerCase() === 'real';

  let confidenceVal = 0;
  if (result.confidence !== null && result.confidence !== undefined && !isNaN(Number(result.confidence))) {
    const num = Number(result.confidence);
    confidenceVal = (num > 0 && num <= 1) ? num * 100 : num;
  }
  const displayConfidence = confidenceVal.toFixed(1);

  // Fallbacks for display
  const rirVal = result.rirScore !== null ? Number(result.rirScore).toFixed(4) : "0.1245";
  const breathingVal = result.breathingScore !== null ? Number(result.breathingScore).toFixed(4) : "0.9420";

  const getSummary = () => {
    if (result.summary) return result.summary;
    if (isReal) {
      return `The uploaded audio appears to be authentic with a ${displayConfidence}% confidence score.`;
    } else {
      return `The uploaded audio has been flagged as a potential deepfake / synthetic audio with a ${displayConfidence}% confidence score.`;
    }
  };
  const displaySummary = getSummary();

  const handleDownloadReport = () => {
    if (onDownloadReport) {
      onDownloadReport();
    } else {
      try {
        const mockReportData = {
          reportId: `AS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          generatedOn: new Date().toLocaleString(),
          fileName: result.filename,
          analysisDate: new Date().toLocaleString(),
          verdict: result.prediction,
          confidence: result.confidence,
          duration: result.duration,
          sampleRate: 44100,
          channels: 'Stereo (2 Ch)',
          rirScore: result.rirScore || 0.1245,
          breathingScore: result.breathingScore || 0.9420,
          alignmentScore: 0.9421,
          cadence: 'Stable pauses, natural transitions',
          backendVersion: '1.2.0',
          modelVersion: 'AS-ResNet50-V2',
          processingTime: '1.45',
        };
        generateAnalysisReport(mockReportData);
      } catch (e) {
        console.error("Demo report generation failed:", e);
      }
    }
  };

  const handleAnalyzeAnother = () => {
    if (onAnalyzeAnother) {
      onAnalyzeAnother();
    } else {
      navigate("/");
    }
  };

  // Circular gauge config
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidenceVal / 100) * circumference;

  return (
    <div className={`results-container animate-scaleIn`}>
      <div className="result-card">

        {/* Top: Verdict Badge */}
        <div className="verdict-badge-wrapper">
          <div className={`verdict-badge ${isReal ? 'real' : 'fake'}`}>
            {isReal ? (
              <>
                <ShieldCheck size={14} />
                <span>Authentic Audio</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} />
                <span>Synthetic Deepfake</span>
              </>
            )}
          </div>
        </div>

        {/* Middle: Gauge & Technical Grid */}
        <div className="gauge-container">
          <div className="circular-gauge-wrapper">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-current text-zinc-800"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                className={`stroke-current ${isReal ? 'text-cyber-green' : 'text-cyber-rose'}`}
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="gauge-center-text">
              <span className="gauge-pct">{displayConfidence}%</span>
              <span className="gauge-label">{isReal ? "Authentic Prob" : "Deepfake Prob"}</span>
            </div>
          </div>
        </div>

        {/* Three Score Cards */}
        <div className="score-cards-grid">
          <div className={`score-card ${isReal ? 'real-accent' : 'fake-accent'}`}>
            {isReal ? (
              <ShieldCheck size={13} className="score-card-icon text-cyber-green" />
            ) : (
              <AlertTriangle size={13} className="score-card-icon text-cyber-rose" />
            )}
            <span className="score-card-val">{isReal ? 'AUTHENTIC' : 'DEEPFAKE'}</span>
            <span className="score-card-label">Verdict</span>
          </div>

          <div className="score-card">
            <Activity size={13} className="score-card-icon" />
            <span className="score-card-val">{rirVal}</span>
            <span className="score-card-label">RIR Score</span>
          </div>

          <div className="score-card">
            <Volume2 size={13} className="score-card-icon" />
            <span className="score-card-val">{breathingVal}</span>
            <span className="score-card-label">Breathing Score</span>
          </div>
        </div>

        {/* Bottom: Analysis Summary */}
        <div className="results-summary-box">
          <h3>Analysis Summary</h3>
          <p>{displaySummary}</p>
        </div>

        {/* PDF Download Button & Re-analyze */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleDownloadReport}
            className="download-report-btn"
          >
            Download Forensic Report
          </button>

          <button
            onClick={handleAnalyzeAnother}
            className="secondary-btn"
          >
            Analyze Another Audio
          </button>
        </div>

      </div>
    </div>
  );
};

export default React.memo(Results);