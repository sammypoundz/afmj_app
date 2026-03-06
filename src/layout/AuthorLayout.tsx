import AuthorSidebar from "./AuthorSidebar";
import AuthorTopBar from "./AuthorTopBar";
import { Outlet } from "react-router-dom";

const AuthorLayout = () => {
  return (
    <div className="app-shell">
      <AuthorSidebar />

      <div className="main-area">
        <AuthorTopBar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthorLayout;