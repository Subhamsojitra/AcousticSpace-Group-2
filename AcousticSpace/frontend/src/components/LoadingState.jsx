import React from "react";
import "./LoadingState.css";

const LoadingState = () => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>

      <h2>Analyzing Audio...</h2>

      <p>Please wait while AcousticSpace analyzes the uploaded audio.</p>

      <span>This may take a few seconds.</span>
    </div>
  );
};

export default LoadingState;