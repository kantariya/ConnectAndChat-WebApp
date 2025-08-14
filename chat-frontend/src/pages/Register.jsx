import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import registerSide from "../assets/registerside.jpg";
import { toast } from 'react-toastify';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      navigate("/");
    } catch (err) {
        toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff]">
        <h1 className="text-3xl font-bold mb-6 text-black fixed top-0 z-50 text-center w-full mt-10">
          Connect<span className="text-primary">&</span>Chat
        </h1>

        <div className="flex bg-base-100 shadow-xl rounded-lg overflow-hidden">
          <div className="hidden md:block">
            <img
              src={registerSide}
              alt="Register"
              className="h-full object-cover max-h-[500px] w-80"
            />
          </div>
          <div className="card-body max-w-md w-full">
            <h2 className="text-2xl font-bold text-center mb-4 text-black">Register</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <input
                name="name"
                type="text"
                placeholder="Name"
                className="input input-bordered w-full placeholder-gray-600"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                name="username"
                type="text"
                placeholder="Username"
                className="input input-bordered w-full placeholder-gray-600"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="input input-bordered w-full placeholder-gray-600"
                value={formData.email}
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
                {loading ? <span className="loading loading-spinner"></span> : "Register"}
              </button>
              <p className="text-center text-sm mt-2 text-gray-800">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-500 underline">
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
  );
};

export default RegisterPage;
