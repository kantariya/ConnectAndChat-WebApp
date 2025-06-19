import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

const ProtectLayout = () => {
  const { user, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectLayout;
