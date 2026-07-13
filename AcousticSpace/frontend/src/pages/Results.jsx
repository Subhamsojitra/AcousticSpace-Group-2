import "./Results.css";

const Results = () => {
  const result = {
    prediction: "Real",
    confidence: 94,
    filename: "sample_audio.wav",
    duration: "5.2 sec",
    size: "1.8 MB",
  };

  return (
    <div className="results-container">
      <div className="result-card">
        <h1>Analysis Result</h1>

        <div className="prediction">
          <span className="label">Prediction</span>

          <h2
            className={
              result.prediction === "Real" ? "real" : "fake"
            }
          >
            {result.prediction}
          </h2>
        </div>

        <div className="confidence">
          <p>Confidence</p>

          <div className="progress-bar">
            <div
              className="progress"
              style={{ width: `${result.confidence}%` }}
            ></div>
          </div>

          <span>{result.confidence}%</span>
        </div>

        <div className="details">
          <h3>Audio Details</h3>

          <p>
            <strong>Filename:</strong> {result.filename}
          </p>

          <p>
            <strong>Duration:</strong> {result.duration}
          </p>

          <p>
            <strong>Size:</strong> {result.size}
          </p>
        </div>

        <div className="summary">
          <h3>Summary</h3>

          <p>
            The uploaded audio appears to be authentic with a high confidence
            score.
          </p>
        </div>

        <button>Analyze Another Audio</button>
      </div>
    </div>
  );
};

export default Results;