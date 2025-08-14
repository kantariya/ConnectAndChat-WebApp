import { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import defaultAvatar from "../assets/defaultpfp.jpg";
import { useChat } from "../context/ChatContext";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

const FriendSidebar = () => {
  const { selectPrivateChatWithUser } = useChat();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadingUserIds, setLoadingUserIds] = useState([]);
  const navigate = useNavigate();

  const fetchFriendData = async () => {
    try {
      const [incomingRes, outgoingRes, friendsRes] = await Promise.all([
        axios.get("/friends/received"),
        axios.get("/friends/sent"),
        axios.get("/users/friends"),
      ]);
      setIncomingRequests(incomingRes.data || []);
      setOutgoingRequests(outgoingRes.data || []);
      setFriends(friendsRes.data || []);
    } catch (err) {
      console.error("Error loading friend data", err);
      toast.error(err.response?.data?.message || "failed fatching");
    }
  };

  useEffect(() => {
    fetchFriendData();
  }, []);

  const getButtonType = (userId) => {
    if (incomingRequests.some((req) => req.from._id === userId)) return "accept";
    if (outgoingRequests.some((req) => req.to._id === userId)) return "cancel";
    if (friends.some((friend) => friend._id === userId)) return "remove";
    return "send";
  };

  const handleAction = async (type, userId) => {
    setLoadingUserIds((prev) => [...prev, userId]);
    try {
      let requestId = null;

      if (type === "accept") {
        const request = incomingRequests.find((req) => req.from._id === userId);
        requestId = request?._id;
        if (!requestId) throw new Error("Request ID not found for accept");
        await axios.put(`/friends/respond/${requestId}`, { status: "accepted" });
        await axios.post(`/chats/private/${userId}`);
        navigate("/");
      } else if (type === "cancel") {
        const request = outgoingRequests.find((req) => req.to._id === userId);
        requestId = request?._id;
        if (!requestId) throw new Error("Request ID not found for cancel");
        await axios.delete(`/friends/cancel/${requestId}`);
      } else if (type === "send") {
        await axios.post(`/friends/send/${userId}`, {});
      } else if (type === "remove") {
        const confirmed = window.confirm(
          "Are you sure you want to remove this friend?\nNote: Your private chat with them will also be deleted!"
        );
        if (!confirmed) return;
        await axios.delete(`/users/remove-friend/${userId}`);

      }

      await fetchFriendData();
      if (search) {
        await handleSearch(search);
      }
    } catch (err) {
      console.error("Action failed", err);
      toast.error(err.response?.data?.message || "failed to handle action");
    } finally {
      setLoadingUserIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleSearch = async (query) => {
    try {
      const res = await axios.get(`/users/search?username=${query}`);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error("Search failed", err);
      toast.error(err.response?.data?.message || "Failed to search");
    }
  };

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearch(query);
    if (query.trim()) {
      await handleSearch(query);
    } else {
      setSearchResults([]);
    }
  };

  const displayedUsers = search ? searchResults : incomingRequests.map((req) => req.from);

  return (
    <div className="w-1/3 max-w-sm border-r border-white bg-[#1d232a] flex flex-col h-full">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search users to add friend"
          value={search}
          onChange={handleSearchChange}
          className="input input-bordered w-full bg-[#191e24] border-white text-[#ffffff] placeholder-gray-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {displayedUsers.map((user) => {
          const buttonType = getButtonType(user._id);
          const isLoading = loadingUserIds.includes(user._id);
          return (
            <div
              key={user._id}
              className="flex flex-col gap-2 md:flex-row md:gap-0 items-center justify-between p-2 bg-[#191e24] rounded cursor-pointer hover:bg-gray-700 transition-colors duration-200"
            >
              <div
                className="flex items-center gap-2 flex-1"
                onClick={() => selectPrivateChatWithUser(user)}
              >
                <img
                  src={user.profilePic || defaultAvatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-[#ffffff]">{user.name}</p>
                  <p className="text-sm text-gray-400">@{user.username}</p>
                </div>
              </div>
              <div>
                <button
                  className={`btn btn-xs ${buttonType === "remove" ? "bg-red-600 hover:bg-red-700" : "bg-[#605dff] hover:bg-[#504bf1]"
                    } text-white border-none`}
                  disabled={isLoading}
                  onClick={() => handleAction(buttonType, user._id)}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : buttonType === "accept" ? (
                    "Accept"
                  ) : buttonType === "cancel" ? (
                    "Cancel"
                  ) : buttonType === "remove" ? (
                    "Remove"
                  ) : (
                    "Send Request"
                  )}
                </button>
              </div>
            </div>
          );
        })}
        {displayedUsers.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {search ? "No users found" : "No incoming requests"}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendSidebar;
