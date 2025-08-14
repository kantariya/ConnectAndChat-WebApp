import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import loginSide from "../assets/registerside.jpg";
import { toast } from 'react-toastify';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData);
      navigate("/");
    } catch (error) {
      console.log("Login failed", error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff]">
        <h1 className="text-3xl font-bold mb-6  text-black fixed top-0 z-50 text-center w-full mt-10">
          Connect<span className="text-primary">&</span>Chat
        </h1>

        <div className="flex bg-base-100 shadow-xl rounded-lg overflow-hidden">
          <div className="hidden md:block items-center justify-center">
            <img
              src={loginSide}
              alt="Login"
              className="h-full object-cover max-h-[500px] w-80"
            />
          </div>
          <div className="card-body max-w-md w-full flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-center mb-4 text-black">Login</h2>
            <form className="space-y-4 w-full" onSubmit={handleSubmit}>
              <input
                name="emailOrUsername"
                type="text"
                placeholder="Email or Username"
                className="input input-bordered w-full placeholder-gray-600"
                value={formData.emailOrUsername}
                onChange={handleChange}
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="input input-bordered w-full placeholder-gray-600"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <span className="loading loading-spinner"></span> : "Login"}
              </button>
              <p className="text-center text-sm mt-2 text-gray-800">
                Don’t have an account?{" "}
                <Link to="/register" className="text-blue-500 underline">
                  Register
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
  );
};

export default Login;
