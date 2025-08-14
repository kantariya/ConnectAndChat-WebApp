import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Outlet } from "react-router-dom";

const AuthLayout = () => {
  const { user, loadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loadingAuth && user) {
      navigate("/");
    }
  }, [user, loadingAuth, navigate]);

  if (loadingAuth) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return !user ? (
    <div className="min-h-screen bg-[#1d232a] text-[#d5d5d5]">
      <div className="max-w-full mx-auto p-4">
        <Outlet />
      </div>
    </div>
  ) : null;
};

export default AuthLayout;
