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
  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Analysis History</h1>

        <p>View all previously analyzed audio files.</p>
      </div>

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
            <h3>{item.fileName}</h3>

            <div className="history-info">
              <p>
                <strong>Prediction:</strong>{" "}
                <span
                  className={
                    item.prediction === "Real"
                      ? "prediction-real"
                      : "prediction-fake"
                  }
                >
                  {item.prediction}
                </span>
              </p>

              <p>
                <strong>Confidence:</strong> {item.confidence}
              </p>

              <p>
                <strong>Processing Time:</strong> {item.processingTime}
              </p>

              <p>
                <strong>Timestamp:</strong> {item.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;