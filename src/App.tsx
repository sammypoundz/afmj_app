import { Toaster } from 'react-hot-toast';
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes";

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" />  {/* 👈 Add this line */}
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;