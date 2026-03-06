const AuthorNewSubmission = () => {
  return (
    <div>
      <h2>Submit New Manuscript</h2>

      <form className="form-grid">
        <div>
          <label>Title</label>
          <input type="text" placeholder="Enter manuscript title" />
        </div>

        <div>
          <label>Journal Section</label>
          <select>
            <option>Health Informatics</option>
            <option>Public Health</option>
            <option>Clinical Research</option>
          </select>
        </div>

        <div>
          <label>Abstract</label>
          <textarea rows={6} placeholder="Enter abstract..." />
        </div>

        <div>
          <label>Keywords</label>
          <input type="text" placeholder="e.g AI, Healthcare, ML" />
        </div>

        <div>
          <label>Upload Manuscript</label>
          <input type="file" />
        </div>

        <div>
          <label>Upload Cover Letter</label>
          <input type="file" />
        </div>

        <div>
          <label>Co-Authors</label>
          <input type="text" placeholder="Add co-authors separated by commas" />
        </div>

        <button type="submit">Submit Manuscript</button>
      </form>
    </div>
  );
};

export default AuthorNewSubmission;