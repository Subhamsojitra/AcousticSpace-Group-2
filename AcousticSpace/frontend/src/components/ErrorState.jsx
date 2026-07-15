import "./ErrorState.css";

const ErrorState = () => {
  return (
    <div className="error-container">
      <div className="error-card">
        <div className="error-icon">⚠️</div>

        <h2>Analysis Failed</h2>

        <p>
          Something went wrong while analyzing the uploaded audio.
        </p>

        <span>
          Please check your connection or try uploading another file.
        </span>

        <button>Try Again</button>
      </div>
    </div>
  );
};

export default ErrorState;