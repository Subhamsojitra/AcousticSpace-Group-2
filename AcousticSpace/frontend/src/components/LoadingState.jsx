import React from "react";
import "./LoadingState.css";
import { useNavigate } from "react-router-dom";

const LoadingState = ({ message, isDemo = true }) => {
  const navigate = useNavigate();
  return (
    <div className={`loading-container ${!isDemo ? 'embedded' : ''}`}>
      <div className="spinner"></div>

      <h2>Analyzing Audio...</h2>

      <p>{message || "Please wait while AcousticSpace analyzes the uploaded audio."}</p>

      <span>This may take a few seconds.</span>

      {isDemo && (
        <button
          className="loading-btn"
          onClick={() => navigate("/results")}
        >
          View Demo Result
        </button>
      )}
    </div>
  );
};

export default LoadingState;