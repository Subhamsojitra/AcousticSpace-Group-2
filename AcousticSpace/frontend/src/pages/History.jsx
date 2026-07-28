import "./History.css";

// =====================================================
// TEMPORARY DUMMY DATA
// -----------------------------------------------------
// This data is used only for frontend UI development.
//
// TODO (Backend - Shubham):
// Replace this array with the data returned from the
// /history API once backend integration is complete.
//
// Example:
// const historyData = await fetch("/history");
//
// Expected API response:
// [
//   {
//     id,
//     fileName,
//     prediction,
//     confidence,
//     processingTime,
//     timestamp
//   }
// ]
// =====================================================

const historyData = [
  {
    id: 1,
    fileName: "meeting_audio.wav",
    prediction: "Real",
    confidence: "98.6%",
    processingTime: "1.8 sec",
    timestamp: "28 Jul 2026, 3:15 PM",
  },
  {
    id: 2,
    fileName: "interview_audio.mp3",
    prediction: "Fake",
    confidence: "92.4%",
    processingTime: "2.1 sec",
    timestamp: "27 Jul 2026, 11:40 AM",
  },
  {
    id: 3,
    fileName: "podcast_sample.wav",
    prediction: "Real",
    confidence: "95.1%",
    processingTime: "1.6 sec",
    timestamp: "26 Jul 2026, 7:25 PM",
  },
];

const History = () => {
  // =====================================================
  // TEMPORARY FRONTEND STATE
  // -----------------------------------------------------
  // Used only to demonstrate the Empty State UI.
  //
  // TODO (Backend - Shubham):
  // Replace this flag with:
  //
  // const showEmptyState = historyData.length === 0;
  //
  // after the /history API is integrated.
  // =====================================================

    const showLoadingState = false;
    const showEmptyState = false;

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Analysis History</h1>
        <p>View all previously analyzed audio files.</p>
      </div>

      {showLoadingState ? (
        <div className="history-loading">
         <div className="loader"></div>
         <h2>Loading Analysis History...</h2>
         <p>Please wait while we fetch your previous analyses.</p>
        </div>
        ) : showEmptyState ? (
        <div className="history-empty">
          <div className="empty-icon">📂</div>

          <h2>No Analysis History</h2>

          <p>
            Your previous audio analyses will appear here once
            you analyze an audio file.
          </p>
        </div>
      ) : (
        <>
          {/* =====================================================
              HISTORY RECORDS

              Frontend:
              Displaying temporary dummy data.

              TODO (Backend - Shubham):
              Replace "historyData" with the response received
              from the /history API.

              Example:
              historyData.map(...)
          ===================================================== */}

          <div className="history-list">
            {historyData.map((item) => (
              <div className="history-card" key={item.id}>
                <div className="history-card-header">
                  <h3>🎵 {item.fileName}</h3>

                  <span
                    className={
                      item.prediction === "Real"
                        ? "prediction-badge real"
                        : "prediction-badge fake"
                    }
                  >
                    {item.prediction}
                  </span>
                </div>

                <div className="history-info">
                  <p>
                    <strong>Confidence:</strong> {item.confidence}
                  </p>

                  <p>
                    <strong>Processing Time:</strong>{" "}
                    {item.processingTime}
                  </p>

                  <p>
                    <strong>Timestamp:</strong> {item.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default History;