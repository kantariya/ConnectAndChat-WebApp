// src/context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "../utils/axiosConfig";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from 'react-toastify';


const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  // will hold { [userId]: true | Date }
  const [onlineStatus, setOnlineStatus] = useState({});
  const [isSocketReady, setIsSocketReady] = useState(false);

  const joinedChatIds = useRef(new Set());

  const socketRef = useRef(null);
  const prevChatIdRef = useRef(null);

  const selectedChatRef = useRef(selectedChat);

  const handleError = (data) => {
    toast.error(data.message);
  };


  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);


  // Initialize Socket.io when user logs in

  useEffect(() => {
    if (user && chats.length > 0 && socketRef.current) {
      chats.forEach(chat => {
        if (!joinedChatIds.current.has(chat._id)) {
          socketRef.current.emit("joinChat", chat._id);
          joinedChatIds.current.add(chat._id); //  only join once
        }
      });
    }
  }, [user, chats]);


  useEffect(() => {
    if (!user) return;

    if (socketRef.current) {
      console.log("✅ socket already initialized, skipping...");
      return;
    }


    const socketURL = import.meta.env.MODE === "production"
      ? "/" // production = same origin
      : "http://localhost:5000"; // development backend

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ["websocket"],
    });

    socketRef.current = socket;


    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socketRef.current = socket;
      setIsSocketReady(true);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
      toast.error(err.message);
    });

    if (!socketRef.current) {
      console.log("socketRef.current not found in chatContext");
      return;
    }



    socket.on("errorMessage", handleError);

    socket.on("userOnlineStatus", ({ userId, isOnline, lastSeen }) => {
      setOnlineStatus(prev => ({
        ...prev,
        [userId]: isOnline ? true : (lastSeen || new Date())
      }));
    });


    // 3.1.1. messageReceived (others’ messages)
    socket.on("messageReceived", (msg) => {
      const chatId = msg.chat;
      const openChatId = selectedChatRef.current?._id;

      if (openChatId === chatId && socketRef.current) {
        socketRef.current.emit("markAsRead", { chatId });
      }

      // 1) add into messages
      setMessages(prev => {
        const arr = prev[chatId] || [];
        return { ...prev, [chatId]: [...arr, msg] };
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

      // Update chat.latestMessage if edited message is latest
      setChats(prevChats =>
        prevChats.map(c =>
          c._id === chatId && c.latestMessage?._id === msg._id
            ? { ...c, latestMessage: { ...msg } }
            : c
        )
      );
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

      setChats(prevChats =>
        prevChats.map(c => {
          if (c._id === chatId && c.latestMessage?._id === messageId) {
            // Find new latest message from existing messages (if available)
            const updatedMsgs = messages[chatId]?.filter(m => m._id !== messageId) || [];
            const newLatest = updatedMsgs.length ? updatedMsgs[updatedMsgs.length - 1] : null;
            return { ...c, latestMessage: newLatest || null };
          }
          return c;
        })
      );
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

      setChats(prevChats =>
        prevChats.map(c => {
          if (c._id === chatId && c.latestMessage?._id === messageId) {
            return { ...c, latestMessage: { ...c.latestMessage, deletedFor: [...(c.latestMessage.deletedFor || []), user._id] } };
          }
          return c;
        })
      );
    });



    // 3.1.6. messageSeen (read receipt)
    socket.on("messageSeen", ({ messageId, userId, chatId }) => {
      setMessages(prev => {
        const arr = prev[chatId] || [];
        const newArr = arr.map(m => {
          if (m._id === messageId) {
            // Always return a new object, even if userId already present
            const readByArr = m.readBy || [];
            const updatedReadBy = readByArr.includes(userId)
              ? readByArr
              : [...readByArr, userId];

            return { ...m, readBy: updatedReadBy };
          }
          return m;
        });
        return { ...prev, [chatId]: newArr };
      });


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
    socket.on("typing", ({ userId, chatId }) => {
      setTypingUsers(prev => {
        const set = new Set(prev[chatId] || []);
        set.add(userId);
        return { ...prev, [chatId]: set };
      });
    });
    socket.on("stopTyping", ({ userId, chatId }) => {
      setTypingUsers(prev => {
        const set = new Set(prev[chatId] || []);
        set.delete(userId);
        return { ...prev, [chatId]: set };
      });
    });

    // 3.1.8. chatCleared
    socket.on("chatCleared", ({ chatId, clearedAt }) => {

      setMessages(prev => {
        const prevMsgs = prev[chatId] || [];
        const newArr = prevMsgs.filter(m => new Date(m.createdAt) > new Date(clearedAt));
        return { ...prev, [chatId]: newArr };
      });

      setChats(prevChats =>
        prevChats.map(c => {
          if (c._id === chatId) {
            const latest = c.latestMessage;
            const isCleared = latest && new Date(latest.createdAt) <= new Date(clearedAt);
            const clearedAtMap = { ...(c.clearedAt || {}), [user._id]: clearedAt };

            return {
              ...c,
              latestMessage: isCleared ? null : latest,
              clearedAt: clearedAtMap,
            };
          }
          return c;
        })
      );
    });

    // 3.1.9. messageReactionUpdated
    socket.on("messageReactionUpdated", ({ messageId, reactions, chat: chatId }) => {
      console.log("Parameters in messageReactionUpdated:", { messageId, reactions, chatId });
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

    //  ─── listen for our new `chatUpdated` broadcasts ───
    socketRef.current.on("chatUpdated", ({ chatId, latestMessage, lastRead }) => {
      const openChatId = selectedChatRef.current?._id;
      const currentUserId = user._id;

      setChats(prev =>
        prev.map(c => {
          if (c._id !== chatId) return c;

          // calculate new unreadCount
          let unreadCount = c.unreadCount || 0;
          const lastReadTime = lastRead?.[currentUserId] ? new Date(lastRead[currentUserId]) : null;
          const msgTime = new Date(latestMessage?.createdAt);

          if (openChatId === chatId) {
            // I'm already in the chat => 0 unread
            unreadCount = 0;
          } else if (!lastReadTime || msgTime > lastReadTime) {
            unreadCount = (c.unreadCount || 0) + 1;
          }

          return {
            ...c,
            latestMessage,
            unreadCount,
          };
        })
      );
    });




    // Cleanup on logout or unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off("typing");
        socketRef.current.off("stopTyping");
        socketRef.current.off("userOnlineStatus");
        socketRef.current.off("chatUpdated");
        socketRef.current.off("chatRead");
        joinedChatIds.current.clear();
        socketRef.current.off("errorMessage", handleError);
      }
      socketRef.current = null;

    };
  }, [user?._id]);

  // 3.2. Fetch user's chats on login or when needed
  const fetchChats = async () => {
    if (!user) return;
    setLoadingChats(true);
    try {
      const res = await axios.get("/chats", { withCredentials: true });
      setChats(res.data.map(chat => {
        const isUnread =
          chat.latestMessage &&
          chat.latestMessage.sender._id !== user._id && // ✅ not your own message
          (
            !chat.lastRead?.[user._id] ||
            new Date(chat.latestMessage.createdAt) > new Date(chat.lastRead[user._id])
          );


        return {
          ...chat,
          unreadCount: isUnread ? 1 : 0
        };
      }));
    } catch (err) {
      console.error("Failed to fetch chats:", err);
      toast.error(err.response?.data?.message || "Failed to fetch chats");
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
      const msgs = res.data || [];

      // No need to filter again — backend already handled deletedFor and clearedAt

      setMessages(prev => ({ ...prev, [chatId]: msgs }));
    } catch (err) {
      console.error("Failed to fetch messages for chat", chatId, err);
      toast.error(err.response?.data?.message || "Failed to fetch messages");
    } finally {
      setLoadingMessages(false);
    }
  };


  // 3.4. selectChat: join socket room and fetch messages
  const selectChat = async (chat) => {
    try {
      if (!chat || !socketRef.current) {
        setSelectedChat(null);
        return;
      }

      const other = chat.isGroupChat ? null : chat.participants.find(p => p._id !== user._id);

      // join new room
      socketRef.current.emit("joinChat", chat._id);

      // immediately tell server to mark it read
      socketRef.current.emit("markAsRead", { chatId: chat._id });

      // locally clear count
      setChats(prev =>
        prev.map(c =>
          c._id === chat._id ? { ...c, unreadCount: 0 } : c
        )
      );

      // set selected
      setSelectedChat(chat);
      selectedChatRef.current = chat;
      prevChatIdRef.current = chat._id;

      // fetch history
      fetchMessages(chat._id);

      const res2 = await axios.get(`/users/status/${other._id}`, { withCredentials: true });
      const { isOnline, lastSeen } = res2.data;
      onlineStatus[other?._id] = isOnline ? true : (lastSeen || new Date());
    } catch (err) {
      toast.error(err.response?.data?.message || "failed to select chat");
    }
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
      if (err.response?.status === 403) {
        toast.error("You can only chat with friends.");
      }
      else {
        console.error("Failed to access/create private chat:", err);
        toast.error(err.response?.data?.message || "Failed to access/create private chat");
      }
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
  // const createGroupChat = async (name, userIds) => {
  //   try {
  //     const res = await axios.post("/chats/group", { name, userIds });
  //     const chat = res.data;
  //     setChats(prev => [chat, ...prev]);
  //     selectChat(chat);
  //   } catch (err) {
  //     console.error("Failed to create group chat:", err);
  //       toast.error(err.message);

  //   }
  // };

  // // Rename group
  // const renameGroupChat = async (chatId, newName) => {
  //   try {
  //     const res = await axios.put(`/chats/group/rename/${chatId}`, { name: newName });
  //     const updated = res.data;
  //     setChats(prev => prev.map(c => (c._id === chatId ? updated : c)));
  //     if (selectedChat?._id === chatId) {
  //       setSelectedChat(updated);
  //     }
  //   } catch (err) {
  //     console.error("Failed to rename group chat:", err);
  //      toast.error(err.message);
  //   }
  // };

  // // Add to group
  // const addToGroup = async (chatId, userId) => {
  //   try {
  //     const res = await axios.put(`/chats/group/add/${chatId}`, { userId });
  //     const updated = res.data;
  //     setChats(prev => prev.map(c => (c._id === chatId ? updated : c)));
  //     if (selectedChat?._id === chatId) setSelectedChat(updated);
  //   } catch (err) {
  //     console.error("Failed to add to group:", err);
  //     toast.error(err.message);
  //   }
  // };

  // // Remove from group / leave group
  // const removeFromGroup = async (chatId, userId) => {
  //   try {
  //     const res = await axios.put(`/chats/group/remove/${chatId}`, { userId });
  //     const updated = res.data;
  //     setChats(prev => prev.filter(c => c._id !== chatId).map(c => c._id === updated._id ? updated : c));
  //     if (selectedChat?._id === chatId) {
  //       // If current user left, clear selectedChat
  //       if (user._id === userId) {
  //         setSelectedChat(null);
  //       } else {
  //         setSelectedChat(updated);
  //       }
  //     }
  //   } catch (err) {
  //     console.error("Failed to remove from group:", err);
  //       toast.error(err.message);
  //   }
  // };

  // // Make group admin
  // const makeGroupAdmin = async (chatId, userId) => {
  //   try {
  //     const res = await axios.put(`/chats/group/make-admin/${chatId}`, { userId });
  //     const updated = res.data;
  //     setChats(prev => prev.map(c => (c._id === chatId ? updated : c)));
  //     if (selectedChat?._id === chatId) setSelectedChat(updated);
  //   } catch (err) {
  //     console.error("Failed to make admin:", err);
  //  toast.error(err.message);
  //   }
  // };

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
        typingUsers,
        setTypingUsers,
        clearChat,
        reactToMessage,
        // createGroupChat,
        // renameGroupChat,
        // addToGroup,
        // removeFromGroup,
        // makeGroupAdmin,
        onlineStatus,
        socket: socketRef.current,
        isSocketReady,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);