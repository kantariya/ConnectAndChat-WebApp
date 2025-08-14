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
        <div className="navbar bg-[#1d232a] shadow-sm px-4 text-[#d5d5d5] border-b border-white">
            {/* The logo container is now hidden on mobile and only appears on medium screens and up */}
            <div className="navbar-start md:block hidden">
                <button
                    className="btn btn-ghost"
                    onClick={() => navigate("/")}
                >
                    <img className="h-20 w-20" src="/ConnectNChatIcon.svg" alt="App Logo" />
                </button>
            </div>

            {/* The center tabs are now balanced across all screen sizes */}
            <div className="tabs tabs-boxed navbar-center gap-0.5">
                <input
                    type="radio"
                    name="my_tabs"
                    id="tab-friends"
                    className="hidden peer/tab-friends"
                    checked={currentPath === "/friends"}
                    onChange={() => navigate("/friends")}
                />
                <label
                    htmlFor="tab-friends"
                    className="tab rounded-full px-6 py-2 border border-white text-white
                   peer-checked/tab-friends:border-2 peer-checked/tab-friends:border-[#605dff]
                   peer-checked/tab-friends:text-[#605dff] peer-checked/tab-friends:bg-[#191e24]"
                >
                    <UsersRound color="white"/>
                </label>

                <input
                    type="radio"
                    name="my_tabs"
                    id="tab-chats"
                    className="hidden peer/tab-chats"
                    checked={currentPath === "/"}
                    onChange={() => navigate("")}
                />
                <label
                    htmlFor="tab-chats"
                    className="tab rounded-full px-6 py-2 border border-white text-white
                   peer-checked/tab-chats:border-2 peer-checked/tab-chats:border-[#605dff]
                   peer-checked/tab-chats:text-[#605dff] peer-checked/tab-chats:bg-[#191e24]"
                >
                    <MessagesSquare color="white"/>
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
                    className="tab rounded-full px-6 py-2 border border-white text-white
                   peer-checked/tab-chatbot:border-2 peer-checked/tab-chatbot:border-[#605dff]
                   peer-checked/tab-chatbot:text-[#605dff] peer-checked/tab-chatbot:bg-[#191e24]"
                >
                    <BotMessageSquare color="white"/>
                </label>
            </div>

            {/* The end div is now balanced by the start div */}
            <div className="flex gap-2 navbar-end">
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} className="btn btn-ghost btn-circle avatar">
                        <div className="w-10 rounded-full border border-white">
                            <img src={user?.profilePic || defaultAvatar} alt="Avatar" />
                        </div>
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content bg-[#191e24] rounded-box mt-3 w-52 p-2 shadow border border-white">
                        <li><button className="text-[#d5d5d5] hover:bg-gray-700" onClick={() => navigate("/profile")}>Profile</button></li>
                        <li><button className="text-[#d5d5d5] hover:bg-gray-700" onClick={() => navigate("/settings")}>Settings</button></li>
                        <li><button className="text-red-400 hover:bg-gray-700" onClick={handleLogout}>Logout</button></li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
