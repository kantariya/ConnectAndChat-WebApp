// src/components/ChatWindow.jsx
import { useChat } from "../context/ChatContext";
import { useEffect, useRef, useState } from "react";
import defaultAvatar from "../assets/defaultpfp.jpg";
import {
  Send,
  Edit2,
  Trash2,
  MoreVertical,
  Eye,
  Trash,
  Clock,
} from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

const ChatWindow = () => {
  const {
    user,
    selectedChat,
    messages,
    loadingMessages,
    sendMessage,
    editMessage,
    unsendMessage,
    deleteForMe,
    messageSeen,
    typing,
    stopTyping,
    clearChat,
    reactToMessage,
  } = useChat();

  const [input, setInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showActionsFor, setShowActionsFor] = useState(null); // messageId for showing dropdown
  const [typingUsers, setTypingUsers] = useState([]); // assume ChatContext updates this via socket

  const bottomRef = useRef();

  const chatId = selectedChat?._id;
  const userMessages = chatId ? messages[chatId] || [] : [];

  // Auto-scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [userMessages]);

  // Mark messages as seen on select or new incoming
  useEffect(() => {
    if (chatId) {
      userMessages.forEach((msg) => {
        if (
          msg.sender._id !== user._id &&
          !(msg.readBy || []).includes(user._id)
        ) {
          messageSeen(chatId, msg._id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, userMessages]);

  // Typing indicator emit
  useEffect(() => {
    if (!chatId) return;
    if (input) {
      typing(chatId);
    } else {
      stopTyping(chatId);
    }
    // Could debounce stopTyping if desired
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // Click-outside handler to close dropdown
  const dropdownRefs = useRef({}); // map messageId -> ref

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionsFor) {
        const ref = dropdownRefs.current[showActionsFor];
        if (ref && !ref.contains(e.target)) {
          setShowActionsFor(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionsFor]);

  if (!selectedChat) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-gray-500">
        Select a chat to start messaging.
      </div>
    );
  }

  // Chat header info
  const chatName = selectedChat.isGroupChat
    ? selectedChat.name
    : selectedChat.participants.find((p) => p._id !== user._id)?.name;
  const chatAvatar = selectedChat.isGroupChat
    ? defaultAvatar
    : selectedChat.participants.find((p) => p._id !== user._id)?.profilePic ||
      defaultAvatar;

  // Helper: check time window for edit/unsend (6.5 minutes)
  const canUnsend = (msg) => {
    const created = new Date(msg.createdAt).getTime();
    return Date.now() - created <= 6.5 * 60 * 1000;
  };

  // Determine which actions are allowed on a message
  const actionsForMessage = (msg) => {
    const isSelf = msg.sender._id === user._id;
    const canEdit = isSelf && canUnsend(msg); // allow edit within window
    const canUnsendMsg = isSelf && canUnsend(msg);
    const canDelete = true; // Delete for Me always allowed
    return { canEdit, canUnsendMsg, canDelete };
  };

  // Render read receipts
  const renderReadReceipt = (msg) => {
    if (!selectedChat.isGroupChat) {
      // private: if msg.sender is self and readBy includes other user
      if (msg.sender._id === user._id) {
        const otherId = selectedChat.participants.find(
          (p) => p._id !== user._id
        )?._id;
        if (msg.readBy && msg.readBy.includes(otherId)) {
          return <span className="text-xs text-blue-500">Seen</span>;
        }
      }
    } else {
      // group: show count of others who have read
      if (msg.sender._id === user._id) {
        const readers = (msg.readBy || []).filter((uid) => uid !== user._id);
        if (readers.length > 0) {
          return (
            <span className="text-xs text-gray-500">{readers.length} seen</span>
          );
        }
      }
    }
    return null;
  };

  // Input submit handler (send or confirm edit)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMsgId) {
      // Confirm edit
      if (editContent.trim()) {
        editMessage(editingMsgId, editContent.trim());
      }
      setEditingMsgId(null);
      setEditContent("");
    } else {
      if (input.trim()) {
        sendMessage(input.trim());
      }
      setInput("");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-base-100 border-l">
      {/* Header with Clear Chat and typing indicator */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center">
          <img src={chatAvatar} alt="Chat" className="w-10 h-10 rounded-full" />
          <h2 className="ml-3 text-xl font-semibold">{chatName}</h2>
        </div>
        <div className="flex items-center space-x-2">
          {typingUsers.length > 0 && (
            <span className="text-sm italic text-gray-500">
              {/* You may map IDs to names if you have user list in context */}
              {typingUsers.map((id) => "Someone").join(", ")} typing...
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => clearChat(chatId)}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages && <LoadingSpinner />}
        {!loadingMessages &&
          userMessages.map((msg) => {
            const isSelf = msg.sender._id === user._id;
            const { canEdit, canUnsendMsg, canDelete } = actionsForMessage(msg);

            // Prepare a ref container for this message's dropdown
            const containerRef = (el) => {
              if (el) {
                dropdownRefs.current[msg._id] = el;
              } else {
                delete dropdownRefs.current[msg._id];
              }
            };

            return (
              <div
                key={msg._id}
                className={`chat ${isSelf ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-image">
                  <img
                    src={
                      isSelf
                        ? user.profilePic || defaultAvatar
                        : msg.sender.profilePic || defaultAvatar
                    }
                    alt="avatar"
                    className="w-8 h-8 rounded-full"
                  />
                </div>
                <div className="chat-content flex flex-col relative group">
                  {/* Header: name + timestamp */}
                  <div className="chat-header flex items-center space-x-2">
                    <span className="font-medium">{msg.sender.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.isEdited && " (edited)"}
                    </span>
                  </div>

                  {/* Message bubble or editing input */}
                  <div className="chat-bubble relative">
                    {editingMsgId === msg._id ? (
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                    ) : msg.content ? (
                      msg.content
                    ) : (
                      // In case content is empty (maybe unsent?), you could show placeholder
                      <i className="text-gray-500 italic">Message deleted</i>
                    )}
                  </div>

                  {/* Three-dot button (visible on hover) and dropdown */}
                  {editingMsgId !== msg._id && (
                    <div
                      className="absolute top-0 right-0 p-1 invisible group-hover:visible"
                      ref={containerRef}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionsFor((prev) =>
                            prev === msg._id ? null : msg._id
                          );
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {showActionsFor === msg._id && (
                        <div className="absolute right-0 mt-6 w-40 bg-white rounded shadow-md z-50 text-sm text-gray-800">
                          <ul className="divide-y divide-gray-200">
                            {canEdit && (
                              <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                onClick={() => {
                                  setEditingMsgId(msg._id);
                                  setEditContent(msg.content);
                                  setShowActionsFor(null);
                                }}
                              >
                                <Edit2 size={16} className="mr-2" />
                                Edit
                              </li>
                            )}
                            {/* You can add Reply, Forward, React here similarly */}
                            {canUnsendMsg && (
                              <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                onClick={() => {
                                  unsendMessage(msg._id);
                                  setShowActionsFor(null);
                                }}
                              >
                                <Trash2 size={16} className="mr-2 text-red-600" />
                                Unsend
                              </li>
                            )}
                            {canDelete && (
                              <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                onClick={() => {
                                  deleteForMe(msg._id);
                                  setShowActionsFor(null);
                                }}
                              >
                                <Trash size={16} className="mr-2 text-red-600" />
                                Delete for Me
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* If editing: Save / Cancel */}
                  {editingMsgId === msg._id && (
                    <div className="flex space-x-2 mt-1">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          if (editContent.trim()) {
                            editMessage(msg._id, editContent.trim());
                          }
                          setEditingMsgId(null);
                          setEditContent("");
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditingMsgId(null);
                          setEditContent("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Read receipt */}
                  <div className="mt-1">{renderReadReceipt(msg)}</div>
                </div>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t">
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={editingMsgId ? "Edit message..." : "Type a message..."}
            value={editingMsgId ? editContent : input}
            onChange={(e) => {
              if (editingMsgId) {
                setEditContent(e.target.value);
              } else {
                setInput(e.target.value);
              }
            }}
          />
          <button type="submit" className="btn btn-primary">
            <Send className="w-5 h-5" />
          </button>
          {editingMsgId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditingMsgId(null);
                setEditContent("");
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
