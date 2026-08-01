import React from 'react';

function LoadingOverlay({ stage }) {
  if (!stage || stage === 'completed' || stage === 'idle' || stage === 'failed') return null;

  return (
    <div className="fixed inset-0 bg-cyber-black/15 z-50 cursor-wait pointer-events-auto" />
  );
}

export default React.memo(LoadingOverlay);
