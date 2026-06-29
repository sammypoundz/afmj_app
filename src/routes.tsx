import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from './pages/Register';
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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

// ========== Welcome Modal Component ==========
const WelcomeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the modal has been shown before
    const hasSeenWelcome = localStorage.getItem('afmj_welcome_seen');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('afmj_welcome_seen', 'true');
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle} onClick={handleClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalAnimationStyle}>
          <div style={iconContainerStyle}>
            <span style={iconStyle}>🎉</span>
          </div>
          <h2 style={titleStyle}>Welcome to AFMJ Online 2.0</h2>
          <p style={descriptionStyle}>
            We've completely redesigned your dashboard experience. 
            <br /><br />
            <strong>What's new?</strong>
            <ul style={listStyle}>
              <li>✅ Intuitive navigation with role‑specific layouts</li>
              <li>✅ Real‑time manuscript tracking and notifications</li>
              <li>✅ Seamless submission, review, and publication workflows</li>
              <li>✅ Enhanced analytics and reporting tools</li>
            </ul>
            <br />
            Explore the new interface and let us know what you think!
          </p>
          <button style={buttonStyle} onClick={handleClose}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles (inline for simplicity – you can move to CSS module)
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
  padding: '20px',
};

const modalContentStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '24px',
  maxWidth: '500px',
  width: '100%',
  padding: '40px 32px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  position: 'relative',
  overflow: 'hidden',
};

const modalAnimationStyle: React.CSSProperties = {
  animation: 'welcomeFadeIn 0.6s ease-out forwards',
  textAlign: 'center',
};

const iconContainerStyle: React.CSSProperties = {
  fontSize: '4rem',
  marginBottom: '12px',
  display: 'block',
};

const iconStyle: React.CSSProperties = {
  display: 'inline-block',
  animation: 'welcomeBounce 1s ease-in-out infinite',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.8rem',
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: '12px',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: '#334155',
  lineHeight: 1.6,
  marginBottom: '24px',
  textAlign: 'left',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  paddingLeft: 0,
  marginTop: '8px',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  padding: '12px 32px',
  borderRadius: '40px',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

// Global CSS for animations (injected once)
const animationStyles = `
  @keyframes welcomeFadeIn {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes welcomeBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;

// Inject styles into document head (only once)
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = animationStyles;
  document.head.appendChild(styleElement);
}

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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

      {/* Global Welcome Modal – shown only when user is logged in */}
      {user && <WelcomeModal />}
    </>
  );
};

export default AppRoutes;