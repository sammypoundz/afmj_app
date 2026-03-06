const ReviewerCompleted = () => {
  return (
    <div className="page">
      <h2>Completed Reviews</h2>

      <div className="panel">
        <div className="list-item">
          <div>
            <strong>AFMJ-2025-0987</strong>
            <p>Financial Inclusion in Rural Areas</p>
            <small>Submitted: Jan 15, 2026</small>
          </div>

          <span className="badge success">Completed</span>
        </div>

        <div className="list-item">
          <div>
            <strong>AFMJ-2025-0944</strong>
            <p>Stock Market Volatility Modeling</p>
            <small>Submitted: Dec 21, 2025</small>
          </div>

          <span className="badge success">Completed</span>
        </div>
      </div>
    </div>
  );
};

export default ReviewerCompleted;