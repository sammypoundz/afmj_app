import ReviewerSidebar from "./ReviewerSidebar";
import ReviewerTopBar from "./ReviewerTopBar";
import { Outlet } from "react-router-dom";

const ReviewerLayout = () => {
  return (
    <div className="app-shell">
      <ReviewerSidebar />

      <div className="main-area">
        <ReviewerTopBar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ReviewerLayout;