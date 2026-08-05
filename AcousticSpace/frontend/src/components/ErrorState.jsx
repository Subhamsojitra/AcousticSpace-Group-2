import "./ErrorState.css";
import { useNavigate } from "react-router-dom";

const ErrorState = ({ message, onRetry, isDemo = true }) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      navigate("/");
    }
  };

  return (
    <div className={`error-container ${!isDemo ? 'embedded' : ''}`}>
      <div className={`error-card ${!isDemo ? 'embedded' : ''}`}>
        <div className="error-icon">⚠️</div>

        <h2>Analysis Failed</h2>

        <p>
          {message || "Something went wrong while analyzing the uploaded audio."}
        </p>

        <span>
          Please check your connection or try uploading another file.
        </span>

        <button onClick={handleRetry}>
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ErrorState;