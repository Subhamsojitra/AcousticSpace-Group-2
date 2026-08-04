import { jsPDF } from 'jspdf';

/**
 * Normalizes input values to handle undefined or null fields.
 * Returns "Unavailable" if the value is not present.
 */
function normalize(val, formatter = null) {
  if (val === null || val === undefined || val === '') {
    return 'Unavailable';
  }
  if (formatter) {
    try {
      return formatter(val);
    } catch {
      return 'Unavailable';
    }
  }
  return String(val);
}

/**
 * Formats a confidence score to percentage.
 */
function formatConfidence(val) {
  if (val === null || val === undefined || val === '') return 'Unavailable';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  const scaled = (num > 0 && num <= 1) ? num * 100 : num;
  return `${scaled.toFixed(2)}%`;
}

/**
 * Generates and downloads a forensic PDF analysis report.
 * @param {Object} reportData - The normalized report data structure.
 */
export function generateAnalysisReport(reportData) {
  if (!reportData) {
    console.error('Cannot generate PDF: reportData is null or undefined.');
    return;
  }

  // Create standard A4 document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageHeight = 297;
  const margin = 20;
  const contentWidth = 210 - (margin * 2); // 170mm
  let y = 25; // Vertical tracker

  // Helper: Section Header
  const drawSectionHeader = (title) => {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(33, 43, 54); // Deep Slate Blue
    doc.text(title, margin, y);
    y += 2.5;
    
    doc.setDrawColor(200, 206, 214);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
  };

  // Helper: Grid Row
  const drawRow = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 110, 120);
    doc.text(label, margin + 2, y);

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 26);
    
    // Clean display of value
    const displayVal = normalize(value);
    doc.text(displayVal, margin + 80, y);

    // Light dividing row line
    doc.setDrawColor(240, 244, 248);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 2, margin + contentWidth, y + 2);
    
    y += 6.5;
  };

  // 1. BRANDING HEADER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39); // Deep dark
  doc.text('ACOUSTICSPACE', margin, y);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 140);
  doc.text('FORENSIC AUDIO SECURITY & METRICS LEDGER', margin, y + 4.5);

  // Top header dividing bar
  doc.setDrawColor(33, 43, 54); // Slate Accent
  doc.setLineWidth(0.8);
  doc.line(margin, y + 7, margin + contentWidth, y + 7);
  y += 18;

  // 2. DOCUMENT TITLE & KEY DETAILS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(26, 26, 26);
  doc.text('DEEPFAKE AUDIO DETECTION REPORT', margin, y);
  y += 6;

  // Report details (ID & Generated Timestamp)
  const reportId = normalize(reportData.reportId);
  const generatedOn = normalize(reportData.generatedOn);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text(`REPORT ID: ${reportId}   |   GENERATED ON: ${generatedOn}`, margin, y);
  y += 10;

  // 3. INTEGRITY VERDICT BOX
  const isReal = typeof reportData.verdict === 'string' && reportData.verdict.trim().toLowerCase() === 'real';
  const rawConfidence = reportData.confidence;
  const formattedConf = formatConfidence(rawConfidence);

  // Colors for alert box
  const boxFillColor = isReal ? [240, 253, 244] : [254, 242, 242]; // light green vs light red
  const boxBorderColor = isReal ? [34, 197, 94] : [239, 68, 68]; // green vs red
  const textAlertColor = isReal ? [21, 128, 61] : [185, 28, 28];

  doc.setFillColor(...boxFillColor);
  doc.setDrawColor(...boxBorderColor);
  doc.setLineWidth(0.5);
  // Rounded rect for verdict banner
  doc.rect(margin, y, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textAlertColor);
  const verdictLabel = isReal ? 'AUTHENTIC' : 'SUSPICIOUS / DEEPFAKE';
  doc.text(`FORENSIC VERDICT: ${verdictLabel}`, margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Model classification confidence score calculated at ${formattedConf}.`, margin + 5, y + 13);
  y += 28;

  // 4. CASE INFORMATION
  drawSectionHeader('CASE INFORMATION');
  drawRow('File Name', reportData.fileName);
  drawRow('Analysis Timestamp', reportData.analysisDate);
  y += 5;

  // 5. AUDIO METADATA SPECIFICATIONS
  drawSectionHeader('AUDIO METADATA');
  
  const durationText = reportData.duration !== null && reportData.duration !== undefined
    ? `${Number(reportData.duration).toFixed(2)} s`
    : null;
  const sampleRateText = reportData.sampleRate !== null && reportData.sampleRate !== undefined
    ? `${reportData.sampleRate} Hz`
    : null;

  drawRow('File Duration', durationText);
  drawRow('Sample Rate', sampleRateText);
  drawRow('Audio Channels', reportData.channels);
  y += 5;

  // 6. FORENSIC CLASSIFICATION DETAILS
  drawSectionHeader('PREDICTION ANALYSIS METRICS');
  
  // Format score metrics if numbers
  const rirScoreText = reportData.rirScore !== null && reportData.rirScore !== undefined
    ? `${Number(reportData.rirScore).toFixed(4)}`
    : null;
  const breathScoreText = reportData.breathingScore !== null && reportData.breathingScore !== undefined
    ? `${Number(reportData.breathingScore).toFixed(4)}`
    : null;
  const alignmentScoreText = reportData.alignmentScore !== null && reportData.alignmentScore !== undefined
    ? `${Number(reportData.alignmentScore).toFixed(4)}`
    : null;

  drawRow('Classifier Prediction', reportData.verdict ? reportData.verdict.toUpperCase() : null);
  drawRow('Classifier Confidence', formattedConf);
  drawRow('Room Impulse Response (RIR) Score', rirScoreText);
  drawRow('Breathing Analysis Score', breathScoreText);
  drawRow('Cadence Pause Alignment Score', alignmentScoreText);
  drawRow('Cadence Verdict Classification', reportData.cadence);
  y += 5;

  // 7. DIAGNOSTICS & SYSTEM INFO
  drawSectionHeader('DIAGNOSTICS & SYSTEM INFO');
  
  const procTimeText = reportData.processingTime !== null && reportData.processingTime !== undefined
    ? `${reportData.processingTime}s`
    : null;

  drawRow('Backend System Version', reportData.backendVersion);
  drawRow('Neural Classifier Model Version', reportData.modelVersion);
  drawRow('Forensic Pipeline Processing Time', procTimeText);
  y += 8;

  // 8. LEGAL DISCLAIMER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(33, 43, 54);
  doc.text('FORENSIC DISCLAIMER', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 130, 140);
  const disclaimerText = 
    'This forensic audio report was compiled dynamically by the AcousticSpace deep learning detection interface. ' +
    'Predictions, confidence parameters, and cadence pause analyses represent probabilistic computations run against ' +
    'acoustic signatures. These metrics serve as diagnostic indicators for signal authenticity and do not constitute ' +
    'conclusive forensic testimony or legal declarations.';
  
  // Auto-wrap disclaimer text inside page boundaries
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth);
  doc.text(splitDisclaimer, margin, y);

  // 9. FOOTER
  const footerY = pageHeight - 12;
  doc.setDrawColor(230, 235, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 2, margin + contentWidth, footerY - 2);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 160, 170);
  doc.text('CONFIDENTIAL // ACOUSTICSPACE FORENSIC ANALYSIS', margin, footerY);
  doc.text('PAGE 1 OF 1', margin + contentWidth - 20, footerY);

  // Save the report file
  const safeFileName = reportData.fileName
    ? reportData.fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    : 'analysis';
  doc.save(`acousticspace_report_${safeFileName}.pdf`);
}
