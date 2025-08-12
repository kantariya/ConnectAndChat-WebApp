// src/components/Navbar.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { MessagesSquare, UsersRound, BotMessageSquare } from 'lucide-react';
import defaultAvatar from "../assets/defaultpfp.jpg";
import { toast } from 'react-toastify';


const Navbar = () => {
    
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            toast.error(err.message);
            console.error("Logout failed", err.message);
        }
    };

    const currentPath = location.pathname;

    return (
        <div className="navbar bg-black shadow-sm px-4">
            {/* The logo container now has no flex class */}
            <div className="navbar-start">
                <button
                    className="btn btn-ghost text-xl text-primary"
                    onClick={() => navigate("/")}
                >
                    <img className="h-20 w-20" src="/ConnectNChatIcon.svg" alt="App Logo" />
                </button>
            </div>
            {/* This center div is correctly positioned */}
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
                    <UsersRound />
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
                    <MessagesSquare />
                </label>

                <input
                    type="radio"
                    name="my_tabs"
                    id="tab-chatbot"
                    className="hidden peer/tab-chatbot"
                    checked={currentPath === "/chatbot"}
                    onChange={() => navigate("/chatbot")}
                />
                <label
                    htmlFor="tab-chatbot"
                    className="tab rounded-full px-6 py-2 border border-gray-300 text-gray-500
                   peer-checked/tab-chatbot:border-2 peer-checked/tab-chatbot:border-white
                   peer-checked/tab-chatbot:text-white peer-checked/tab-chatbot:bg-base-100"
                >
                    <BotMessageSquare />
                </label>
            </div>
            {/* This end div is now balanced by the start div */}
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
