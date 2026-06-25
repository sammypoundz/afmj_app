import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";

/* Layouts */
import EICLayout from "./layout/EICLayout";
import EditorLayout from "./layout/EditorLayout";
import ReviewerLayout from "./layout/ReviewerLayout";
import AuthorLayout from "./layout/AuthorLayout";

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
import UserReviewer from "./pages/eic/AllReviewers";
import UserAuthor from "./pages/eic/AllAuthors";
import UserEditor from "./pages/eic/AllEditors";

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

/* ================= Author Pages ================= */
import AuthorDashboard from "./pages/author/AuthorDashboard";
import AuthorSubmissions from "./pages/author/AuthorSubmissions";
import AuthorNewSubmission from "./pages/author/AuthorNewSubmission";
import AuthorManuscriptDetails from "./pages/author/AuthorManuscriptDetails";
import AuthorRevisions from "./pages/author/AuthorRevisions";
import AuthorPublished from "./pages/author/AuthorPublished";
import AuthorProfile from "./pages/author/AuthorProfile";
import AuthorGalleyHistory from "./pages/author/AuthorGalleyHistory";
import AuthorPaymentHistory from "./pages/author/AuthorPaymentHistory";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If the user is admin but allowedRoles only contains eic, treat admin as eic
    if (user.role === 'admin' && allowedRoles.includes('eic')) {
      return children;
    }
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Root redirect based on role */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/eic' : `/${user.role}`} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ================= EIC AREA (also accessible by admin) ================= */}
      <Route
        path="/eic"
        element={
          <ProtectedRoute allowedRoles={['eic', 'admin']}>
            <EICLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="manuscripts" element={<Manuscripts />} />
        <Route path="manuscripts/:status" element={<ManuscriptCategoryView />} />
        <Route path="publications/published" element={<Published />} />
        <Route path="users/reviewers" element={<UserReviewer />} />
        <Route path="users/editors" element={<UserEditor />} />
        <Route path="users/authors" element={<UserAuthor />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<ProfileAndLogs />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="publications/decision" element={<Publication />} />
        <Route path="publications/issues" element={<JournalIssues />} />
      </Route>

      {/* ================= EDITOR AREA ================= */}
      <Route
        path="/editor"
        element={
          <ProtectedRoute allowedRoles={['editor']}>
            <EditorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EditorDashboard />} />
        <Route path="manuscripts/new" element={<EditorNewSubmissions />} />
        <Route path="manuscripts/review" element={<EditorUnderReview />} />
        <Route path="manuscripts/revisions" element={<EditorRevisions />} />
        <Route path="manuscripts/accepted" element={<EditorAccepted />} />
        <Route path="manuscripts/rejected" element={<EditorRejected />} />
        <Route path="manuscripts/:id" element={<EditorManuscriptWorkspace />} />
        <Route path="assign-reviewers" element={<ReviewerAssignmentPage />} />
        <Route path="review-progress" element={<ReviewProgressPage />} />
        <Route path="handle-revisions" element={<RevisionHandlingPage />} />
      </Route>

      {/* ================= REVIEWER AREA ================= */}
      <Route
        path="/reviewer"
        element={
          <ProtectedRoute allowedRoles={['reviewer']}>
            <ReviewerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ReviewerDashboard />} />
        <Route path="invitations" element={<ReviewerInvitations />} />
        <Route path="active" element={<ReviewerActiveReviews />} />
        <Route path="revisions" element={<ReviewerRevisions />} />
        <Route path="completed" element={<ReviewerCompleted />} />
        <Route path="overdue" element={<ReviewerOverdue />} />
        <Route path="analytics" element={<ReviewerAnalytics />} />
        <Route path="submit/:id" element={<ReviewSubmissionPage />} />
        <Route path="submit/manuscript/:id" element={<ReviewSubmissionPage />} />
      </Route>

      {/* ================= AUTHOR AREA ================= */}
      <Route
        path="/author"
        element={
          <ProtectedRoute allowedRoles={['author']}>
            <AuthorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AuthorDashboard />} />
        <Route path="submissions" element={<AuthorSubmissions />} />
        <Route path="submit" element={<AuthorNewSubmission />} />
        <Route path="manuscript/:id" element={<AuthorManuscriptDetails />} />
        <Route path="revisions" element={<AuthorRevisions />} />
        <Route path="published" element={<AuthorPublished />} />
        <Route path="profile" element={<AuthorProfile />} />
        <Route path="galley-history" element={<AuthorGalleyHistory />} />
        <Route path="payment-history" element={<AuthorPaymentHistory />} />
      </Route>

      {/* Fallback for unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;