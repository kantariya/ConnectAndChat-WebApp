// src/context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "../utils/axiosConfig";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  const socketRef = useRef(null);
  const prevChatIdRef = useRef(null);

  // Initialize Socket.io when user logs in
  useEffect(() => {
    if (!user) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });
    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    if (!socketRef.current) {
      console.log("socketRef.current not found in chatContext");
      return;
    }

    // 3.1.1. messageReceived (others’ messages)
    socket.on("messageReceived", (msg) => {
      const chatId = msg.chat;
      // Filter if this user has deletedFor or chat cleared?
      setMessages(prev => {
        // Check if this chat is currently cleared for user after msg.createdAt
        // We'll rely on fetchMessages filter; here assume if message arrives after clear, it's ok.
        const prevMsgs = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...prevMsgs, msg],
        };
      });
      // Update chat list latestMessage
      setChats(prevChats => {
        const idx = prevChats.findIndex(c => c._id === chatId);
        if (idx !== -1) {
          const updatedChat = { ...prevChats[idx], latestMessage: msg };
          const newChats = [...prevChats];
          newChats.splice(idx, 1);
          return [updatedChat, ...newChats];
        }
        return prevChats;
      });
    });

    // 3.1.2. messageSent (ack for sender)
    socket.on("messageSent", (msg) => {
      const chatId = msg.chat;
      setMessages(prev => {
        const prevMsgs = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...prevMsgs, msg],
        };
      });
      setChats(prevChats => {
        const idx = prevChats.findIndex(c => c._id === chatId);
        if (idx !== -1) {
          const updatedChat = { ...prevChats[idx], latestMessage: msg };
          const newChats = [...prevChats];
          newChats.splice(idx, 1);
          return [updatedChat, ...newChats];
        }
        return prevChats;
      });
    });

    // 3.1.3. messageEdited
    socket.on("messageEdited", (msg) => {
      const chatId = msg.chat;
      setMessages(prev => {
        const arr = prev[chatId] || [];
        const newArr = arr.map(m => m._id === msg._id ? msg : m);
        return { ...prev, [chatId]: newArr };
      });
    });

    // 3.1.4. messageUnsent
    socket.on("messageUnsent", ({ messageId, chat: chatId }) => {
      setMessages(prev => {
        const prevMsgs = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: prevMsgs.filter(msg => msg._id !== messageId),
        };
      });
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === chatId && c.latestMessage?._id === messageId) {
            return { ...c, latestMessage: null };
          }
          return c;
        });
      });
    });

    // 3.1.5. messageDeletedForMe (only this user)
    socket.on("messageDeletedForMe", ({ messageId, chat: chatId }) => {
      setMessages(prev => {
        const prevMsgs = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: prevMsgs.filter(msg => msg._id !== messageId),
        };
      });
    });

    // 3.1.6. messageSeen (read receipt)
    socket.on("messageSeen", ({ messageId, userId, chat: chatId }) => {
      setMessages(prev => {
        const arr = prev[chatId] || [];
        const newArr = arr.map(m => {
          if (m._id === messageId) {
            // Append readBy if not already
            const readByArr = m.readBy || [];
            if (!readByArr.includes(userId)) {
              return { ...m, readBy: [...readByArr, userId] };
            }
          }
          return m;
        });
        return { ...prev, [chatId]: newArr };
      });
      // Optionally update chat list UI to show “Seen” on latest message
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === chatId) {
            // you can store e.g. c.lastSeenBy = { messageId, userId } or similar
            return c; // or update if needed
          }
          return c;
        });
      });
    });

    // 3.1.7. typing / stopTyping
    socketRef.current.on("typing", ({ userId, chat }) => {
      setTypingUsers(prev => {
        const set = new Set(prev[chat] || []);
        set.add(userId);
        return { ...prev, [chat]: set };
      });
    });
    socketRef.current.on("stopTyping", ({ userId, chat }) => {
      setTypingUsers(prev => {
        const set = new Set(prev[chat] || []);
        set.delete(userId);
        return { ...prev, [chat]: set };
      });
    });

    // 3.1.8. chatCleared
    socket.on("chatCleared", ({ chatId, clearedAt }) => {
      // Remove local messages older than clearedAt
      setMessages(prev => {
        const prevMsgs = prev[chatId] || [];
        const newArr = prevMsgs.filter(m => new Date(m.createdAt) > new Date(clearedAt));
        return { ...prev, [chatId]: newArr };
      });
    });

    // 3.1.9. messageReactionUpdated
    socket.on("messageReactionUpdated", ({ messageId, reactions, chat: chatId }) => {
      setMessages(prev => {
        const arr = prev[chatId] || [];
        const newArr = arr.map(m => {
          if (m._id === messageId) {
            return { ...m, reactions };
          }
          return m;
        });
        return { ...prev, [chatId]: newArr };
      });
    });

    // Cleanup on logout or unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off("typing");
        socketRef.current.off("stopTyping");
      }
      socketRef.current = null;
    };
  }, [user, chats]);

  // 3.2. Fetch user's chats on login or when needed
  const fetchChats = async () => {
    if (!user) return;
    setLoadingChats(true);
    try {
      const res = await axios.get("/chats", { withCredentials: true });
      setChats(res.data || []);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      setChats([]);
      setSelectedChat(null);
      setMessages({});
    }
  }, [user]);

  // 3.3. Fetch messages for a chat (HTTP GET), then filter out deletedFor and clearedAt
  const fetchMessages = async (chatId) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const res = await axios.get(`/messages/${chatId}`, { withCredentials: true });
      let msgs = res.data || [];
      // Filter: removed messages where deletedFor includes current user
      msgs = msgs.filter(m => {
        if (m.deletedFor && m.deletedFor.includes(user._id)) return false;
        // Filter by clearedAt:
        // Find chat.clearedAt for this user (we need chat info). Assume chats[] has that.
        const chatObj = chats.find(c => c._id === chatId);
        if (chatObj && chatObj.clearedAt) {
          const clearedAt = chatObj.clearedAt[user._id]; // depending on how backend returns clearedAt
          if (clearedAt && new Date(m.createdAt) <= new Date(clearedAt)) {
            return false;
          }
        }
        return true;
      });
      // Ensure fromSelf flag: backend likely set fromSelf
      setMessages(prev => ({ ...prev, [chatId]: msgs }));
    } catch (err) {
      console.error("Failed to fetch messages for chat", chatId, err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 3.4. selectChat: join socket room and fetch messages
  const selectChat = (chat) => {
    if (!chat || !socketRef.current) {
      setSelectedChat(null);
      return;
    }
    // Leave previous
    if (prevChatIdRef.current) {
      socketRef.current.emit("leaveChat", prevChatIdRef.current);
    }
    setSelectedChat(chat);
    prevChatIdRef.current = chat._id;
    socketRef.current.emit("joinChat", chat._id);
    // Fetch history
    fetchMessages(chat._id);
  };

  // 3.5. selectPrivateChatWithUser (HTTP to create/get private chat)
  const selectPrivateChatWithUser = async (userObj) => {
    if (!userObj || !user) return;
    try {
      const res = await axios.post(`/chats/private/${userObj._id}`, {}, { withCredentials: true });
      const chat = res.data;
      setChats(prev => {
        const exists = prev.some(c => c._id === chat._id);
        if (exists) {
          return [chat, ...prev.filter(c => c._id !== chat._id)];
        } else {
          return [chat, ...prev];
        }
      });
      selectChat(chat);
    } catch (err) {
      console.error("Failed to access/create private chat:", err);
    }
  };

  // 3.6. sendMessage via socket
  const sendMessage = (content, replyTo = null) => {
    if (!selectedChat || !socketRef.current) return;
    const payload = {
      chatId: selectedChat._id,
      content,
      replyTo,
    };
    socketRef.current.emit("sendMessage", payload);
  };

  // 3.7. editMessage via socket
  const editMessage = (messageId, newContent) => {
    if (!socketRef.current) return;
    socketRef.current.emit("editMessage", { messageId, content: newContent });
  };

  // 3.8. unsendMessage via socket
  const unsendMessage = (messageId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("unsendMessage", { messageId });
  };

  // 3.9. deleteForMe via socket
  const deleteForMe = (messageId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("deleteForMe", { messageId });
  };

  // 3.10. messageSeen when user views message or opens chat; can be called on e.g. scroll or focus
  const messageSeen = (chatId, messageId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("messageSeen", { chatId, messageId });
  };

  // 3.11. typing / stopTyping
  const typing = (chatId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { chatId });
  };
  const stopTyping = (chatId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("stopTyping", { chatId });
  };

  // 3.12. clearChat
  const clearChat = (chatId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("clearChat", { chatId });
    // Frontend will receive 'chatCleared' event to clear UI
  };

  // 3.13. reactToMessage
  const reactToMessage = (messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit("reactMessage", { messageId, emoji });
  };


  // Create group chat
  const createGroupChat = async (name, userIds) => {
    try {
      const res = await axios.post("/chats/group", { name, userIds });
      const chat = res.data;
      setChats(prev => [chat, ...prev]);
      selectChat(chat);
    } catch (err) {
      console.error("Failed to create group chat:", err);
    }
  };

  // Rename group
  const renameGroupChat = async (chatId, newName) => {
    try {
      const res = await axios.put(`/chats/group/rename/${chatId}`, { name: newName });
      const updated = res.data;
      setChats(prev => prev.map(c => (c._id === chatId ? updated : c)));
      if (selectedChat?._id === chatId) {
        setSelectedChat(updated);
      }
    } catch (err) {
      console.error("Failed to rename group chat:", err);
    }
  };

  // Add to group
  const addToGroup = async (chatId, userId) => {
    try {
      const res = await axios.put(`/chats/group/add/${chatId}`, { userId });
      const updated = res.data;
      setChats(prev => prev.map(c => (c._id === chatId ? updated : c)));
      if (selectedChat?._id === chatId) setSelectedChat(updated);
    } catch (err) {
      console.error("Failed to add to group:", err);
    }
  };

  // Remove from group / leave group
  const removeFromGroup = async (chatId, userId) => {
    try {
      const res = await axios.put(`/chats/group/remove/${chatId}`, { userId });
      const updated = res.data;
      setChats(prev => prev.filter(c => c._id !== chatId).map(c => c._id === updated._id ? updated : c));
      if (selectedChat?._id === chatId) {
        // If current user left, clear selectedChat
        if (user._id === userId) {
          setSelectedChat(null);
        } else {
          setSelectedChat(updated);
        }
      }
    } catch (err) {
      console.error("Failed to remove from group:", err);
    }
  };

  // Make group admin
  const makeGroupAdmin = async (chatId, userId) => {
    try {
      const res = await axios.put(`/chats/group/make-admin/${chatId}`, { userId });
      const updated = res.data;
      setChats(prev => prev.map(c => (c._id === chatId ? updated : c)));
      if (selectedChat?._id === chatId) setSelectedChat(updated);
    } catch (err) {
      console.error("Failed to make admin:", err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        user,
        chats,
        loadingChats,
        selectedChat,
        selectChat,
        selectPrivateChatWithUser,
        messages,
        loadingMessages,
        fetchChats,
        sendMessage,
        editMessage,
        unsendMessage,
        deleteForMe,
        messageSeen,
        typing,
        stopTyping,
        clearChat,
        reactToMessage,
        createGroupChat,
        renameGroupChat,
        addToGroup,
        removeFromGroup,
        makeGroupAdmin,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);