// src/components/ChatListSidebar.jsx
import { useChat } from "../context/ChatContext";
import { useState } from "react";
import defaultAvatar from "../assets/defaultpfp.jpg";
import { Link } from "react-router-dom";

const ChatListSidebar = () => {
  const { chats, loadingChats, selectChat, selectedChat, user } = useChat();
  const [search, setSearch] = useState("");

  // Get other participant in private chat
  const getOtherParticipant = (chat) => {
    return chat.participants.find(p => p._id !== user._id);
  };

  // Search filtering
  const filteredChats = chats.filter(chat => {
    if (chat.isGroupChat) {
      return chat.name.toLowerCase().includes(search.toLowerCase());
    } else {
      const other = getOtherParticipant(chat);
      return other?.name.toLowerCase().includes(search.toLowerCase());
    }
  });

  // Return safe latest message (not deletedForMe or cleared)
  const getSafeLatestMessage = (chat) => {
    const msg = chat.latestMessage;
    if (!msg) return null;

    const isDeleted = msg.deletedFor?.includes(user._id);
    const clearedAt = chat.clearedAt?.[user._id];
    const isCleared = clearedAt && new Date(msg.createdAt) <= new Date(clearedAt);

    return isDeleted || isCleared ? null : msg;
  };

  // Chat display name
  const renderChatName = (chat) => {
    if (chat.isGroupChat) return chat.name;
    const other = getOtherParticipant(chat);
    return other?.name || "Unknown";
  };

  return (
    <div className="w-1/3 max-w-sm border-r border-white bg-[#1d232a] flex flex-col h-full">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search chats"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full bg-[#191e24] border-white text-white placeholder-gray-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingChats && <div className="p-4 text-center text-gray-500">Loading chats...</div>}

        {!loadingChats && filteredChats.map(chat => {
          const isSelected = selectedChat?._id === chat._id;
          const avatarUrl = chat.isGroupChat
            ? defaultAvatar
            : getOtherParticipant(chat)?.profilePic || defaultAvatar;

          const safeLatest = getSafeLatestMessage(chat);

          return (
            <div
              key={chat._id}
              className={`flex items-center p-2 cursor-pointer transition-colors duration-200 
            hover:bg-[#191e24] ${isSelected ? "bg-[#191e24] border-l-4 border-[#605dff]" : ""}`}
              onClick={() => selectChat(chat)}
            >
              <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full" />
              <div className="ml-3 flex-1 text-[#d5d5d5]">
                <div className="font-medium text-white">{renderChatName(chat)}</div>
                <div className="flex justify-between">
                  {safeLatest && (
                    <div className="text-sm text-gray-400 truncate">
                      {safeLatest.sender.name}: {safeLatest.content.slice(0, 30)}
                      {safeLatest.content.length > 30 ? "..." : ""}
                    </div>
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="badge badge-sm bg-[#605dff] text-white border-none ml-2">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {!loadingChats && filteredChats.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No friends found, add friends from{" "}
            <Link to="/friends" className="text-[#605dff] underline hover:text-[#504bf1]">
              Friends Page
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatListSidebar;
