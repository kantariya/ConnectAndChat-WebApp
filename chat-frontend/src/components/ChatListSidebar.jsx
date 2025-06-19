// src/components/ChatListSidebar.jsx
import { useChat } from "../context/ChatContext";
import { useState } from "react";
import defaultAvatar from "../assets/defaultpfp.jpg";

const ChatListSidebar = () => {
  const { chats, loadingChats, selectChat, selectedChat } = useChat();
  const [search, setSearch] = useState(""); 

  // Helper to get current user ID from context user
  const { user } = useChat();
  const chatParticipantsSelfId = () => user?._id;

  // Filter chats by participant name or group name
  const filteredChats = chats.filter(chat => {
    if (chat.isGroupChat) {
      return chat.name.toLowerCase().includes(search.toLowerCase());
    } else {
      // find the other participant
      const other = chat.participants.find(p => p._id !== chatParticipantsSelfId());
      return other?.name.toLowerCase().includes(search.toLowerCase());
    }
  });

  

  const renderChatName = (chat) => {
    if (chat.isGroupChat) {
      return chat.name;
    }
    // Private chat: show other user's name
    const other = chat.participants.find(p => p._id !== user._id);
    return other?.name || "Unknown";
  };

  return (
    <div className="w-1/3 max-w-sm border-r bg-base-200 flex flex-col h-full">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search chats"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingChats && <div className="p-4 text-center">Loading chats...</div>}
        {!loadingChats && filteredChats.map(chat => {
          const isSelected = selectedChat?._id === chat._id;
          // For display avatar: for group, maybe a group icon; for private, other user's avatar
          let avatarUrl = defaultAvatar;
          if (!chat.isGroupChat) {
            const other = chat.participants.find(p => p._id !== user._id);
            avatarUrl = other?.profilePic || defaultAvatar;
          }
          return (
            <div
              key={chat._id}
              className={`flex items-center p-2 cursor-pointer hover:bg-base-300
                ${isSelected ? "bg-base-300" : ""}`}
              onClick={() => selectChat(chat)}
            >
              <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full" />
              <div className="ml-3 flex-1">
                <div className="font-medium">{renderChatName(chat)}</div>
                {chat.latestMessage && (
                  <div className="text-sm text-gray-500 truncate">
                    {chat.latestMessage.sender.name}: {chat.latestMessage.content.slice(0, 30)}
                    {chat.latestMessage.content.length > 30 ? "..." : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!loadingChats && filteredChats.length === 0 && (
          <div className="p-4 text-center text-gray-500">No chats found</div>
        )}
      </div>
    </div>
  );
};

export default ChatListSidebar;
