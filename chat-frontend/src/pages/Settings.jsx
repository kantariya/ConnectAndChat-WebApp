// src/pages/SettingsPage.jsx
import { useState } from "react";
import axios from "../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";



const SettingsPage = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      return setError("All fields are required.");
    }
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const res = await axios.put(
        "/users/changePassword",
        { oldPassword, newPassword },
        { withCredentials: true }
      );
      setSuccess("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Are you sure you want to delete your account? It will delete all related data of yours. You can't recover your account back. This action is irreversible.");
    if (!confirm) return;

    try {
      setLoading(true);
      await axios.delete("/users/deleteAccount", { withCredentials: true });
      setUser(null); // Clear user context
      navigate("/login");
    } catch (err) {
      setError("Failed to delete account.");
      console.log("account delete error",err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-base-100 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="space-y-3">
        <h3 className="font-medium">Change Password</h3>
        <input
          type="password"
          placeholder="Current Password"
          className="input input-bordered w-full"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New Password"
          className="input input-bordered w-full"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          className="input input-bordered w-full"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          Change Password
        </button>
      </form>

      {/* Delete Account */}
      <div className="mt-8">
        <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
        <button
          onClick={handleDeleteAccount}
          className="btn btn-error w-full"
          disabled={loading}
        >
          Delete Account
        </button>
      </div>

      {/* Status */}
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {success && <p className="mt-4 text-green-500">{success}</p>}
    </div>
  );
};

export default SettingsPage;
