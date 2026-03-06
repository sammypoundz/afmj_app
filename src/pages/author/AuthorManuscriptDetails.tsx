import { useParams } from "react-router-dom";

const AuthorManuscriptDetails = () => {
  const { id } = useParams();

  return (
    <div>
      <h2>Manuscript Details — {id}</h2>

      <section>
        <h4>Status</h4>
        <p><strong>Major Revision</strong></p>
        <p>Editor Assigned: Dr. James Carter</p>
        <p>Last Updated: Jan 28, 2026</p>
      </section>

      <section>
        <h4>Review Timeline</h4>
        <ul>
          <li>Submitted — Dec 18, 2025</li>
          <li>Under Review — Jan 05, 2026</li>
          <li>Decision: Major Revision — Jan 28, 2026</li>
        </ul>
      </section>

      <section>
        <h4>Reviewer Comments</h4>
        <p>
          Reviewer 1: The methodology requires clarification in section 3...
        </p>
        <p>
          Reviewer 2: Statistical analysis should include confidence intervals...
        </p>
      </section>

      <section>
        <button>Download Decision Letter</button>
        <button>Download Reviewer Reports</button>
      </section>
    </div>
  );
};

export default AuthorManuscriptDetails;