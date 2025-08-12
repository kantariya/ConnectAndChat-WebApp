// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import FriendsPage from "./pages/FriendsPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SettingsPage from "./pages/Settings";
import ProfilePage from "./pages/ProfilePage";   
import MainLayout from "./layouts/MainLayout";
import ProtectLayout from "./layouts/ProtectLayout";
import AuthLayout from "./layouts/AuthLayout";
import ChatBotPage from "./pages/ChatBotPage";


const App = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected routes under MainLayout */}
      <Route element={<MainLayout />}>
        <Route element={<ProtectLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/chatbot" element={<ChatBotPage/>} />
          {/* add other protected routes */}
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<div className="p-4">404 Not Found</div>} />
    </Routes>
  );
};

export default App;



