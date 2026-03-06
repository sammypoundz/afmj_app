import type { FC } from "react";

const ReviewerTopBar: FC = () => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h3>Reviewer Workspace</h3>
      </div>

      <div className="topbar-right">
        <span>Dr. John Doe</span>
      </div>
    </header>
  );
};

export default ReviewerTopBar;