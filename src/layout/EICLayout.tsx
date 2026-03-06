import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Outlet } from "react-router-dom";

const EICLayout = () => {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <TopBar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EICLayout;