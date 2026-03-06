const ReviewerOverdue = () => {
  return (
    <div className="page">
      <h2>Overdue Reviews</h2>

      <div className="panel">
        <div className="list-item overdue">
          <div>
            <strong>AFMJ-2026-0121</strong>
            <p>Microfinance Lending Performance</p>
            <small>Was due: Feb 20, 2026</small>
          </div>

          <button className="btn-danger">Submit Now</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewerOverdue;