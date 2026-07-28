import "./EmptyState.css";
import { useNavigate } from "react-router-dom";

const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="empty-container">
      <div className="empty-card">
        <div className="empty-icon">🎵</div>

        <h2>No Analysis Yet</h2>

        <p>
          Upload an audio file to begin deepfake audio detection.
        </p>

        <span>
          Your analysis results will appear here after processing.
        </span>

        <button onClick={() => navigate("/")}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default EmptyState;