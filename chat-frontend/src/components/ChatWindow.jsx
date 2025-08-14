// src/components/ChatWindow.jsx
import { useChat } from "../context/ChatContext";
import { useEffect, useRef, useState } from "react";
import defaultAvatar from "../assets/defaultpfp.jpg";
import {
  Send,
  Edit2,
  Trash2,
  MoreVertical,
  Smile,
  Trash,
  Check,
  CheckCheck,
  MessageCircleReply,
  X,
} from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

import formatLastSeen from "../utils/formatLastSeen.js";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "👏", "🎉", "😎"];

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
    typingUsers,
    reactToMessage,
    onlineStatus,
  } = useChat();

  const [input, setInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showActionsFor, setShowActionsFor] = useState(null);
  const [showReactionPickerFor, setShowReactionPickerFor] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const clearButtonRef = useRef();

  const bottomRef = useRef();
  const typingTimeoutRef = useRef(null);
  const dropdownRefs = useRef({});
  const reactionPickerRefs = useRef({});
  const messageRefs = useRef({});
  const scrollableDivRef = useRef();

  const chatId = selectedChat?._id;
  const userMessages = chatId ? messages[chatId] || [] : [];
  const currentTypingSet = typingUsers[chatId] || new Set();
  const currentTypingArray = Array.from(currentTypingSet);
  const other = selectedChat?.isGroupChat
    ? null
    : selectedChat?.participants.find((p) => p._id !== user._id);

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

  // Typing indicator emit with debounce for stopTyping
  useEffect(() => {
    if (!chatId) return;

    if (input.trim()) {
      typing(chatId);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(chatId);
      }, 1000);
    } else {
      stopTyping(chatId);
      clearTimeout(typingTimeoutRef.current);
    }

    return () => clearTimeout(typingTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, chatId]);

  // Click-outside handlers to close dropdowns and reaction pickers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionsFor) {
        const ref = dropdownRefs.current[showActionsFor];
        if (ref && !ref.contains(e.target)) {
          setShowActionsFor(null);
        }
      }
      if (showReactionPickerFor) {
        const refR = reactionPickerRefs.current[showReactionPickerFor];
        if (refR && !refR.contains(e.target)) {
          setShowReactionPickerFor(null);
        }
      }
      if (
        showClearConfirm &&
        clearButtonRef.current &&
        !clearButtonRef.current.contains(e.target)
      ) {
        setShowClearConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionsFor, showReactionPickerFor, showClearConfirm]);

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
    const canEdit = isSelf && canUnsend(msg);
    const canUnsendMsg = isSelf && canUnsend(msg);
    const canDelete = true;
    return { canEdit, canUnsendMsg, canDelete };
  };

  const renderTickIcon = (msg) => {
    if (!selectedChat || selectedChat.isGroupChat || msg.sender._id !== user._id)
      return null;

    const otherId = selectedChat.participants.find(p => p._id !== user._id)?._id;
    const seen = msg.readBy?.includes(otherId);

    return (
      <span className="absolute bottom-2 right-1">
        {seen ? (
          <CheckCheck size={16} className="text-blue-500" />
        ) : (
          <Check size={16} className="text-gray-500" />
        )}
      </span>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMsgId) {
      if (editContent.trim()) {
        editMessage(editingMsgId, editContent.trim());
      }
      setEditingMsgId(null);
      setEditContent("");
    } else {
      if (input.trim()) {
        sendMessage(input.trim(), replyToMessage?._id);
      }
      setInput("");
      setReplyToMessage(null);
    }
  };

  // Helper function to check if an element is near the bottom
  const isMessageNearBottom = (element) => {
    if (!element || !scrollableDivRef.current) return false;
    const scrollableDiv = scrollableDivRef.current;
    const elementRect = element.getBoundingClientRect();
    const scrollableRect = scrollableDiv.getBoundingClientRect();
    // If the message is within the bottom 25% of the scrollable area
    return elementRect.bottom > (scrollableRect.bottom - scrollableRect.height * 0.25);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1d232a] border-l border-[#191e24] text-[#d5d5d5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#191e24] px-4 py-2">
        <div className="flex items-center">
          <img src={chatAvatar} alt="Chat" className="w-10 h-10 rounded-full border border-gray-600" />
          <div className="flex flex-col ml-3">
            <h2 className="ml-3 text-xl font-semibold text-white">{chatName}</h2>
            <div className="text-sm text-gray-400 ml-3">
              {onlineStatus[other?._id] === true
                ? "Online"
                : onlineStatus[other?._id]
                  ? `Last seen ${formatLastSeen(onlineStatus[other?._id])}`
                  : "Offline"}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {currentTypingArray.length > 0 && (
            <span className="text-sm italic text-gray-400">
              {selectedChat.isGroupChat
                ? currentTypingArray
                  .map((id) => {
                    const part = selectedChat.participants.find(
                      (p) => p._id === id
                    );
                    return part ? part.name : "Someone";
                  })
                  .join(", ") + " typing..."
                : "typing..."}
            </span>
          )}
          <div className="relative" ref={clearButtonRef}>
            <button
              className="btn btn-ghost btn-sm text-red-400 hover:bg-gray-700"
              onClick={() => setShowClearConfirm((prev) => !prev)}
            >
              Clear Chat
            </button>
            {showClearConfirm && (
              <div className="absolute right-0 mt-2 w-48 bg-[#191e24] border border-gray-600 rounded-lg shadow-lg z-50 p-3 text-sm">
                <p className="mb-2 text-white">Clear all messages?</p>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-sm btn-ghost text-[#d5d5d5] hover:bg-gray-700"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm bg-red-600 text-white hover:bg-red-700 border-none"
                    onClick={() => {
                      clearChat(chatId);
                      setShowClearConfirm(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollableDivRef}>
        {loadingMessages && <LoadingSpinner />}
        {!loadingMessages &&
          userMessages.map((msg, index) => {
            const isSelf = msg.sender._id === user._id;
            const { canEdit, canUnsendMsg, canDelete } = actionsForMessage(msg);
            const isLastMessage = index === userMessages.length - 1;

            const containerRef = (el) => {
              if (el) {
                dropdownRefs.current[msg._id] = el;
              } else {
                delete dropdownRefs.current[msg._id];
              }
            };
            const pickerRef = (el) => {
              if (el) {
                reactionPickerRefs.current[msg._id] = el;
              } else {
                delete reactionPickerRefs.current[msg._id];
              }
            };
            const messageRef = (el) => {
              messageRefs.current[msg._id] = el;
              if (isLastMessage) bottomRef.current = el;
            };

            const isBottomMessage = isMessageNearBottom(messageRefs.current[msg._id]);

            // Correctly count reactions from an array
            const reactionsCount = msg.reactions?.reduce((acc, reaction) => {
              acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
              return acc;
            }, {});

            return (
              <div
                key={msg._id}
                className={`chat ${isSelf ? "chat-end" : "chat-start"}`}
                ref={messageRef}
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
                <div className="chat-content flex flex-col relative group transition-all duration-300">
                  {/* Pinned Reply Message Display */}
                  {msg.replyTo && (
                    <div
                      className={`p-2 rounded-t-xl ${isSelf ? "bg-[#191e24]" : "bg-gray-700"
                        } border-l-4 border-[#605dff] text-sm italic`}
                    >
                      <p className="font-semibold text-[#605dff]">
                        Replying to {msg.replyTo.sender.name}
                      </p>
                      <p className="text-gray-400 truncate">
                        {msg.replyTo.content}
                      </p>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`chat-bubble relative ${isSelf ? "bg-[#605dff] text-white" : "bg-gray-700 text-white"
                      } ${msg.replyTo ? "rounded-t-none" : ""
                      } inline-block max-w-sm sm:max-w-md lg:max-w-lg`}
                  >
                    <div className="flex flex-col gap-1">
                      {/* Message content */}
                      <div>
                        {editingMsgId === msg._id ? (
                          <input
                            type="text"
                            className="input input-bordered w-full bg-[#191e24] border-gray-600 text-white"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                        ) : msg.content ? (
                          msg.content
                        ) : (
                          <i className="text-gray-500 italic">
                            Message deleted
                          </i>
                        )}
                      </div>
                      {/* Timestamp and seen ticks */}
                      <div
                        className={`chat-footer text-xs flex ${isSelf ? "justify-end" : "justify-start"
                          } items-center space-x-1 mt-1`}
                      >
                        <time className="text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {msg.isEdited && " (edited)"}
                        </time>
                        {renderTickIcon(msg)}
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    <div
                      className={`absolute ${isSelf ? "-left-20" : "-right-20"
                        } top-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1`}
                    >
                      <div className="relative">
                        <button
                          className="p-1 hover:bg-gray-700 rounded tooltip tooltip-primary"
                          data-tip="Reply"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyToMessage(msg);
                            setShowActionsFor(null);
                            setShowReactionPickerFor(null);
                          }}
                        >
                          <MessageCircleReply size={16} className="text-white" />
                        </button>
                      </div>
                      <div className="relative">
                        <button
                          className="p-1 hover:bg-gray-700 rounded tooltip tooltip-primary"
                          data-tip="React"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReactionPickerFor((prev) =>
                              prev === msg._id ? null : msg._id
                            );
                            setShowActionsFor(null);
                          }}
                        >
                          <Smile size={16} className="text-white" />
                        </button>
                      </div>
                      <div className="relative">
                        <button
                          className="p-1 hover:bg-gray-700 rounded tooltip tooltip-primary"
                          data-tip="More"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowActionsFor((prev) =>
                              prev === msg._id ? null : msg._id
                            );
                            setShowReactionPickerFor(null);
                          }}
                        >
                          <MoreVertical size={16} className="text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Three-dot dropdown */}
                    {showActionsFor === msg._id && (
                      <div
                        className={`absolute w-40 bg-[#191e24] rounded shadow-md z-50 text-sm text-[#d5d5d5] border border-gray-600 ${isSelf ? "right-0" : "left-0"
                          } ${isBottomMessage ? "bottom-full mb-2" : "top-full mt-2"}`}
                        ref={containerRef}
                      >
                        <ul className="divide-y divide-gray-700">
                          {canEdit && (
                            <li
                              className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center"
                              onClick={() => {
                                setEditingMsgId(msg._id);
                                setEditContent(msg.content);
                                setShowActionsFor(null);
                              }}
                            >
                              <Edit2 size={16} className="mr-2 text-[#605dff]" />
                              Edit
                            </li>
                          )}
                          {canUnsendMsg && (
                            <li
                              className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center"
                              onClick={() => {
                                unsendMessage(msg._id);
                                setShowActionsFor(null);
                              }}
                            >
                              <Trash2 size={16} className="mr-2 text-red-400" />
                              Unsend
                            </li>
                          )}
                          {canDelete && (
                            <li
                              className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center"
                              onClick={() => {
                                deleteForMe(msg._id);
                                setShowActionsFor(null);
                              }}
                            >
                              <Trash size={16} className="mr-2 text-red-400" />
                              Delete for Me
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Reaction picker popup */}
                    {showReactionPickerFor === msg._id && (
                      <div
                        className={`absolute z-50 bg-[#191e24] rounded shadow-md p-2 border border-gray-600 ${isSelf ? "right-0" : "left-0"
                          } ${isBottomMessage ? "bottom-full mb-2" : "top-full mt-2"}`}
                        ref={pickerRef}
                      >
                        <div className="flex space-x-1">
                          {EMOJI_LIST.map((emoji) => (
                            <button
                              key={emoji}
                              className="text-xl p-1 hover:bg-gray-700 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                reactToMessage(msg._id, emoji);
                                setShowReactionPickerFor(null);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reactions display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div
                        className={`absolute -bottom-2 flex items-center gap-1 bg-[#1d232a] rounded-full px-1 py-0.5 text-xs border border-gray-600 shadow ${isSelf ? "left-0 transform -translate-x-1/2" : "right-0 transform translate-x-1/2"}`}
                      >
                        {Object.entries(reactionsCount).map(([emoji, count]) => (
                          <span key={emoji} className="flex items-center gap-0.5">
                            <span className="text-sm">{emoji}</span>
                            <span className="text-gray-400">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      {/* Message input area */}
      <div className="p-4 border-t border-[#191e24] flex flex-col">
        {/* Pinned reply message display */}
        {replyToMessage && (
          <div className="p-2 -mt-4 bg-[#191e24] border-l-4 border-[#605dff] rounded-t-lg flex items-center justify-between">
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-[#605dff]">
                Replying to {replyToMessage.sender.name}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {replyToMessage.content}
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm p-1 text-gray-400 hover:text-white"
              onClick={() => setReplyToMessage(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            type="text"
            className={`input input-bordered w-full bg-[#191e24] border-gray-600 text-white placeholder-gray-500 ${replyToMessage ? "rounded-t-none" : ""
              }`}
            autoComplete="off"
            name="chatMessage"
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
          <button type="submit" className="btn bg-[#605dff] text-white hover:bg-[#504bf1] border-none">
            <Send className="w-5 h-5" />
          </button>
          {editingMsgId && (
            <button
              type="button"
              className="btn btn-ghost text-[#d5d5d5] hover:bg-gray-700"
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