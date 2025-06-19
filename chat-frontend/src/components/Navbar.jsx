// src/components/Navbar.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { MessagesSquare, UsersRound, Handshake } from 'lucide-react';
import defaultAvatar from "../assets/defaultpfp.jpg";

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const currentPath = location.pathname;

    return (
        <div className="navbar bg-black shadow-sm px-4">
            <div className="flex-1 navbar-start">
                <button
                  className="btn btn-ghost text-xl text-primary"
                  onClick={() => navigate("/")}
                >
                  Connect<span className="text-white">&</span>Chat
                </button>
            </div>
            <div className="tabs tabs-boxed navbar-center gap-0.5">
                <input
                    type="radio"
                    name="my_tabs"
                    id="tab-dashboard"
                    className="hidden peer/tab-dashboard"
                    checked={currentPath === "/friends"}
                    onChange={() => navigate("/friends")}
                />
                <label
                    htmlFor="tab-dashboard"
                    className="tab rounded-full px-6 py-2 border border-gray-300 text-gray-500 
                      peer-checked/tab-dashboard:border-2 peer-checked/tab-dashboard:border-white 
                      peer-checked/tab-dashboard:text-white peer-checked/tab-dashboard:bg-base-100"
                >
                    <MessagesSquare />
                </label>

                <input
                    type="radio"
                    name="my_tabs"
                    id="tab-friends"
                    className="hidden peer/tab-friends"
                    checked={currentPath === "/"}
                    onChange={() => navigate("")}
                />
                <label
                    htmlFor="tab-friends"
                    className="tab rounded-full px-6 py-2 border border-gray-300 text-gray-500 
                      peer-checked/tab-friends:border-2 peer-checked/tab-friends:border-white 
                      peer-checked/tab-friends:text-white peer-checked/tab-friends:bg-base-100"
                >
                    <UsersRound />
                </label>

                <input
                    type="radio"
                    name="my_tabs"
                    id="tab-connect"
                    className="hidden peer/tab-connect"
                    checked={currentPath === "/connect"}
                    onChange={() => navigate("/connect")}
                />
                <label
                    htmlFor="tab-connect"
                    className="tab rounded-full px-6 py-2 border border-gray-300 text-gray-500 
                      peer-checked/tab-connect:border-2 peer-checked/tab-connect:border-white 
                      peer-checked/tab-connect:text-white peer-checked/tab-connect:bg-base-100"
                >
                    <Handshake />
                </label>
            </div>
            <div className="flex gap-2 navbar-end">
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} className="btn btn-ghost btn-circle avatar">
                        <div className="w-10 rounded-full">
                            <img src={user?.profilePic || defaultAvatar} alt="Avatar" />
                        </div>
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box mt-3 w-52 p-2 shadow">
                        <li><button onClick={() => navigate("/profile")}>Profile</button></li>
                        <li><button onClick={() => navigate("/settings")}>Settings</button></li>
                        <li><button onClick={handleLogout}>Logout</button></li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
