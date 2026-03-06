const ReviewerAnalytics = () => {
  return (
    <div className="page">
      <h2>Reviewer Performance Analytics</h2>

      <div className="panel performance-grid">
        <div className="metric-card">
          <h4>Total Reviews</h4>
          <p>42</p>
        </div>

        <div className="metric-card">
          <h4>Avg Completion Time</h4>
          <p>17 Days</p>
        </div>

        <div className="metric-card">
          <h4>On-Time Rate</h4>
          <p>91%</p>
        </div>

        <div className="metric-card">
          <h4>Acceptance Rate</h4>
          <p>68%</p>
        </div>
      </div>

      <div className="panel">
        <h3>Monthly Activity</h3>
        <div className="chart-placeholder">
          📊 Chart showing reviews completed per month
        </div>
      </div>
    </div>
  );
};

export default ReviewerAnalytics;