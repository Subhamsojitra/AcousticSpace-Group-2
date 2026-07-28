import React from "react";
import "./LoadingState.css";
import { useNavigate } from "react-router-dom";

const LoadingState = () => {
  const navigate = useNavigate();
 return (
    <div className="loading-container">
      <div className="spinner"></div>

      <h2>Analyzing Audio...</h2>

      <p>Please wait while AcousticSpace analyzes the uploaded audio.</p>

      <span>This may take a few seconds.</span>

      <button
        className="loading-btn"
        onClick={() => navigate("/results")}
      >
        View Demo Result
      </button>
    </div>
  );
};

export default LoadingState;