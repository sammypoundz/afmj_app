const AuthorRevisions = () => {
  return (
    <div>
      <h2>Revisions Required</h2>

      <div
        style={{
          border: "1px solid #f59e0b",
          padding: 20,
          borderRadius: 8,
          background: "#fff7ed",
        }}
      >
        <h4>Telemedicine Adoption Models</h4>
        <p>Status: Major Revision</p>
        <p>Deadline: March 12, 2026</p>

        <div style={{ marginTop: 10 }}>
          <label>Upload Revised Manuscript</label>
          <input type="file" />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Upload Response to Reviewers</label>
          <input type="file" />
        </div>

        <button style={{ marginTop: 15 }}>
          Submit Revision
        </button>
      </div>
    </div>
  );
};

export default AuthorRevisions;