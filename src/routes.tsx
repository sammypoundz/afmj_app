import { Routes, Route, Navigate } from "react-router-dom";

/* Layouts */
import EICLayout from "./layout/EICLayout";
import EditorLayout from "./layout/EditorLayout";
import ReviewerLayout from "./layout/ReviewerLayout";

/* ================= EIC Pages ================= */
import Dashboard from "./pages/eic/Dashboard";
import Manuscripts from "./pages/eic/Manuscripts";
import ManuscriptCategoryView from "./pages/eic/ManuscriptCategoryView";
import Published from "./pages/eic/Published";
import Notifications from "./pages/eic/Notifications";
import Settings from "./pages/eic/Settings";
import ProfileAndLogs from "./pages/eic/ProfileAndLogs";
import Analytics from "./pages/eic/Analytics";
import Publication from "./pages/eic/Publication";
import JournalIssues from "./pages/eic/JournalIssues";

/* ================= Editor Pages ================= */
import EditorDashboard from "./pages/editor/EditorDashboard";
import EditorManuscriptWorkspace from "./pages/editor/EditorManuscriptWorkspace";
import EditorNewSubmissions from "./pages/editor/EditorNewSubmissions";
import EditorUnderReview from "./pages/editor/EditorUnderReview";
import EditorRevisions from "./pages/editor/EditorRevisions";
import EditorAccepted from "./pages/editor/EditorAccepted";
import EditorRejected from "./pages/editor/EditorRejected";
import ReviewerAssignmentPage from "./pages/editor/ReviewerAssignmentPage";
import ReviewProgressPage from "./pages/editor/ReviewProgressPage";
import RevisionHandlingPage from "./pages/editor/RevisionHandlingPage";

/* ================= Reviewer Pages ================= */
import ReviewerDashboard from "./pages/reviewer/ReviewerDashboard";
import ReviewerInvitations from "./pages/reviewer/Invitations";
import ReviewerActiveReviews from "./pages/reviewer/ActiveReviews";
import ReviewerRevisions from "./pages/reviewer/Revisions";
import ReviewerCompleted from "./pages/reviewer/CompletedReviews";
import ReviewerOverdue from "./pages/reviewer/OverdueReviews";
import ReviewerAnalytics from "./pages/reviewer/ReviewerAnalytics";
import ReviewSubmissionPage from "./pages/reviewer/ReviewSubmissionPage";

/* Author Pages */
import AuthorLayout from "./layout/AuthorLayout";
import AuthorDashboard from "./pages/author/AuthorDashboard";
import AuthorSubmissions from "./pages/author/AuthorSubmissions";
import AuthorNewSubmission from "./pages/author/AuthorNewSubmission";
import AuthorManuscriptDetails from "./pages/author/AuthorManuscriptDetails";
import AuthorRevisions from "./pages/author/AuthorRevisions";
import AuthorPublished from "./pages/author/AuthorPublished";
import AuthorProfile from "./pages/author/AuthorProfile";

const AppRoutes = () => {
  return (
    <Routes>

      {/* ================= EIC AREA ================= */}
      <Route path="/" element={<EICLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="manuscripts" element={<Manuscripts />} />
        <Route path="manuscripts/:status" element={<ManuscriptCategoryView />} />
        <Route path="published" element={<Published />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="eic/settings" element={<Settings />} />
        <Route path="eic/profile-and-logs" element={<ProfileAndLogs />} />
        <Route path="eic/analytics" element={<Analytics />} />
        <Route path="publications/decision" element={<Publication />} />
        <Route path="publications/issues" element={<JournalIssues />} />
      </Route>

      {/* ================= EDITOR AREA ================= */}
      <Route path="/editor" element={<EditorLayout />}>
        <Route path="dashboard" element={<EditorDashboard />} />

        {/* Manuscript Status Pages */}
        <Route path="manuscripts/new" element={<EditorNewSubmissions />} />
        <Route path="manuscripts/review" element={<EditorUnderReview />} />
        <Route path="manuscripts/revisions" element={<EditorRevisions />} />
        <Route path="manuscripts/accepted" element={<EditorAccepted />} />
        <Route path="manuscripts/rejected" element={<EditorRejected />} />

        {/* Dynamic Workspace */}
        <Route path="manuscripts/:id" element={<EditorManuscriptWorkspace />} />

        {/* Quick Actions */}
        <Route path="assign-reviewers" element={<ReviewerAssignmentPage />} />
        <Route path="review-progress" element={<ReviewProgressPage />} />
        <Route path="handle-revisions" element={<RevisionHandlingPage />} />
      </Route>

      {/* ================= REVIEWER AREA ================= */}
      <Route path="/reviewer" element={<ReviewerLayout />}>
        <Route path="dashboard" element={<ReviewerDashboard />} />
        <Route path="invitations" element={<ReviewerInvitations />} />
        <Route path="active" element={<ReviewerActiveReviews />} />
        <Route path="revisions" element={<ReviewerRevisions />} />
        <Route path="completed" element={<ReviewerCompleted />} />
        <Route path="overdue" element={<ReviewerOverdue />} />
        <Route path="analytics" element={<ReviewerAnalytics />} />

        {/* Dynamic Review Submission – by review ID (from active reviews) */}
        <Route path="submit/:id" element={<ReviewSubmissionPage />} />

        {/* New route for re‑evaluating a manuscript (from revision concern) */}
        <Route path="submit/manuscript/:id" element={<ReviewSubmissionPage />} />
      </Route>

      {/* ================= AUTHOR AREA ================= */}
      <Route path="/author" element={<AuthorLayout />}>
        <Route path="dashboard" element={<AuthorDashboard />} />
        <Route path="submissions" element={<AuthorSubmissions />} />
        <Route path="submit" element={<AuthorNewSubmission />} />
        <Route path="manuscript/:id" element={<AuthorManuscriptDetails />} />
        <Route path="revisions" element={<AuthorRevisions />} />
        <Route path="published" element={<AuthorPublished />} />
        <Route path="profile" element={<AuthorProfile />} />
      </Route>

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
};

export default AppRoutes;