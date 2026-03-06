import EditorSidebar from "./EditorSidebar";
import EditorTopBar from "./EditorTopBar";
import { Outlet } from "react-router-dom";

const EditorLayout = () => {
  return (
    <div className="app-shell">
      <EditorSidebar />

      <div className="main-area">
        <EditorTopBar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EditorLayout;