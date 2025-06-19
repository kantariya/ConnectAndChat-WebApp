import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import cookie from "cookie";
import mongoose from "mongoose";
import Message from "./models/Message.model.js";
import Chat from "./models/Chat.model.js";

import { withinTimeLimit } from "./utils/timeUtils.js";

import { authenticateSocket } from "./config/socketAuth.js";



// Route imports
import authRoutes from './routes/auth.routes.js';
import friendRequestRoutes from './routes/friendRequest.routes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";



dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRequestRoutes);
app.use('/api/users', userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => res.send("API is running..."));
app.use(notFound);
app.use(errorHandler);

io.use(async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token;
    const user = await authenticateSocket(token); // returns user doc or throws
    socket.user = user;
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}, user: ${socket.user._id}`);

  // 2.2. Join/Leave chat rooms
  socket.on("joinChat", (chatId) => {
    // Optionally validate membership
    socket.join(chatId);
    console.log(`User ${socket.user._id} joined chat ${chatId}`);
    // Optionally: emit to others “userOnline” in this chat
  });
  socket.on("leaveChat", (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.user._id} left chat ${chatId}`);
  });

  // 2.3. sendMessage
  socket.on("sendMessage", async ({ chatId, content, replyTo }) => {
    try {
      // Validate chatId
      if (!mongoose.Types.ObjectId.isValid(chatId) || !content) {
        return socket.emit("errorMessage", { message: "Invalid data for sendMessage" });
      }
      const chat = await Chat.findById(chatId);
      if (!chat 
          || !chat.participants.map(id=>id.toString()).includes(socket.user._id.toString())
      ) {
        return socket.emit("errorMessage", { message: "Not authorized to send message to this chat" });
      }
      // If replyTo provided, optionally validate existence in same chat
      if (replyTo) {
        if (!mongoose.Types.ObjectId.isValid(replyTo)) {
          return socket.emit("errorMessage", { message: "Invalid replyTo ID" });
        }
        const replyMsg = await Message.findById(replyTo);
        if (!replyMsg || replyMsg.chat.toString()!==chatId) {
          return socket.emit("errorMessage", { message: "Cannot reply to that message" });
        }
      }
      // Create message
      const newMsg = await Message.create({
        sender: socket.user._id,
        chat: chatId,
        content,
        replyTo: replyTo || null,
        readBy: [socket.user._id], // mark as read by sender
        deletedFor: [],
      });
      // Update chat.latestMessage
      chat.latestMessage = newMsg._id;
      await chat.save();

      // Populate fields for sending
      const populated = await Message.findById(newMsg._id)
        .populate("sender", "name username profilePic")
        .populate("replyTo");
      let msgObj = populated.toObject();
      msgObj.fromSelf = true; // for sender

      // Emit to sender
      socket.emit("messageSent", msgObj);
      // Emit to others in room
      socket.to(chatId).emit("messageReceived", {
        ...msgObj,
        fromSelf: false
      });
    } catch (err) {
      console.error("Socket sendMessage error:", err);
      socket.emit("errorMessage", { message: "Failed to send message" });
    }
  });

  // 2.4. editMessage
  socket.on("editMessage", async ({ messageId, content }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId) || !content) {
        return socket.emit("errorMessage", { message: "Invalid data for editMessage" });
      }
      const msg = await Message.findById(messageId);
      if (!msg) {
        return socket.emit("errorMessage", { message: "Message not found" });
      }
      if (msg.sender.toString() !== socket.user._id.toString()) {
        return socket.emit("errorMessage", { message: "Not authorized to edit" });
      }
      // Time window
      const createdTime = new Date(msg.createdAt).getTime();
      if (!withinTimeLimit(msg.createdAt, 6.5*60*1000)) {
        return socket.emit("errorMessage", { message: "Edit window expired" });
      }
      msg.content = content;
      msg.isEdited = true;
      await msg.save();

      // Populate updated message
      const updatedPop = await Message.findById(messageId)
        .populate("sender", "name username profilePic")
        .populate("replyTo");
      const msgObj = updatedPop.toObject();
      msgObj.fromSelf = msg.sender.toString() === socket.user._id.toString();

      // Emit to all in chat
      const chatId = msg.chat.toString();
      io.to(chatId).emit("messageEdited", msgObj);
    } catch (err) {
      console.error("Socket editMessage error:", err);
      socket.emit("errorMessage", { message: "Edit failed" });
    }
  });

  // 2.5. unsendMessage (delete from DB within time window)
  socket.on("unsendMessage", async ({ messageId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return socket.emit("errorMessage", { message: "Invalid message ID" });
      }
      const msg = await Message.findById(messageId);
      if (!msg) {
        return socket.emit("errorMessage", { message: "Message not found" });
      }
      if (msg.sender.toString() !== socket.user._id.toString()) {
        return socket.emit("errorMessage", { message: "Not authorized to unsend" });
      }
      // Time window
      const createdTime = new Date(msg.createdAt).getTime();
      if (Date.now() - createdTime > 6.5*60*1000) {
        return socket.emit("errorMessage", { message: "Unsend window expired" });
      }
      const chatId = msg.chat.toString();
      await Message.findByIdAndDelete(messageId);

      // Emit removal to all participants
      io.to(chatId).emit("messageUnsent", { messageId, chat: chatId });
    } catch (err) {
      console.error("Socket unsendMessage error:", err);
      socket.emit("errorMessage", { message: "Failed to unsend message" });
    }
  });

  // 2.6. deleteForMe (mark message.deletedFor for this user; if all participants have it, delete from DB)
  socket.on("deleteForMe", async ({ messageId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return socket.emit("errorMessage", { message: "Invalid message ID" });
      }
      const msg = await Message.findById(messageId);
      if (!msg) {
        return socket.emit("errorMessage", { message: "Message not found" });
      }
      const chat = await Chat.findById(msg.chat);
      if (!chat
         || !chat.participants.map(id=>id.toString()).includes(socket.user._id.toString())
      ) {
        return socket.emit("errorMessage", { message: "Not authorized to deleteForMe" });
      }
      const userIdStr = socket.user._id.toString();
      // If already in deletedFor, ignore
      if (!msg.deletedFor.map(id=>id.toString()).includes(userIdStr)) {
        msg.deletedFor.push(socket.user._id);
        await msg.save();
      }
      // Notify only this user: so on frontend filter out message
      socket.emit("messageDeletedForMe", { messageId, chat: msg.chat.toString() });

      // Now: if all participants have deletedFor
      const allIds = chat.participants.map(id=>id.toString());
      const delForIds = msg.deletedFor.map(id=>id.toString());
      const allDeleted = allIds.every(id => delForIds.includes(id));
      if (allDeleted) {
        // Delete from DB
        await Message.findByIdAndDelete(messageId);
        // Optionally: no need to notify others because they all already deletedForMe
      }
    } catch (err) {
      console.error("Socket deleteForMe error:", err);
      socket.emit("errorMessage", { message: "deleteForMe failed" });
    }
  });

  // 2.7. messageSeen (read receipts)
  socket.on("messageSeen", async ({ chatId, messageId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId) 
          || !mongoose.Types.ObjectId.isValid(chatId)
      ) {
        return socket.emit("errorMessage", { message: "Invalid IDs for messageSeen" });
      }
      const msg = await Message.findById(messageId);
      if (!msg) return socket.emit("errorMessage", { message: "Message not found" });
      // Check membership
      const chat = await Chat.findById(chatId);
      if (!chat 
          || !chat.participants.map(id=>id.toString()).includes(socket.user._id.toString())
      ) {
        return socket.emit("errorMessage", { message: "Not authorized for messageSeen" });
      }
      const userIdStr = socket.user._id.toString();
      if (!msg.readBy.map(id=>id.toString()).includes(userIdStr)) {
        msg.readBy.push(socket.user._id);
        await msg.save();
      }
      // Broadcast to all in chat that this user has seen messageId
      io.to(chatId).emit("messageSeen", { messageId, userId: userIdStr });
      // Optionally update chat.latestMessage read receipts
    } catch (err) {
      console.error("Socket messageSeen error:", err);
      socket.emit("errorMessage", { message: "messageSeen failed" });
    }
  });

  // 2.8. typing / stopTyping
  socket.on("typing", ({ chatId }) => {
    if (!chatId) return;
    socket.to(chatId).emit("typing", { userId: socket.user._id.toString() });
  });
  socket.on("stopTyping", ({ chatId }) => {
    if (!chatId) return;
    socket.to(chatId).emit("stopTyping", { userId: socket.user._id.toString() });
  });

  // 2.9. clearChat (per-user; update Chat.clearedAt; if all cleared, delete old messages)
  socket.on("clearChat", async ({ chatId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return socket.emit("errorMessage", { message: "Invalid chatId for clearChat" });
      }
      const chat = await Chat.findById(chatId);
      if (!chat 
          || !chat.participants.map(id=>id.toString()).includes(socket.user._id.toString())
      ) {
        return socket.emit("errorMessage", { message: "Not authorized for clearChat" });
      }
      const now = new Date();
      chat.clearedAt.set(socket.user._id.toString(), now);
      await chat.save();
      // Notify this user to clear UI
      socket.emit("chatCleared", { chatId, clearedAt: now });

      // If all participants have cleared:
      const parts = chat.participants.map(id=>id.toString());
      const clearedKeys = Array.from(chat.clearedAt.keys()); // array of userId strings
      const allCleared = parts.every(pid => clearedKeys.includes(pid));
      if (allCleared) {
        // Delete all messages older than the maximum clearedAt
        // Find latest clearedAt among participants
        let latestTime = new Date('2500-01-01');
        for (const pid of parts) {
          const d = new Date(chat.clearedAt.get(pid)).getTime();
          if (d < latestTime) latestTime = d;
        }
        await Message.deleteMany({
          chat: chatId,
          createdAt: { $lt: new Date(latestTime) }
        });
        // Optionally reset chat.clearedAt? If future messages should accumulate from now on.
        chat.clearedAt = new Map(); 
        await chat.save();
      }
    } catch (err) {
      console.error("Socket clearChat error:", err);
      socket.emit("errorMessage", { message: "clearChat failed" });
    }
  });

  // 2.10. reactMessage
  socket.on("reactMessage", async ({ messageId, emoji }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId) || !emoji) {
        return socket.emit("errorMessage", { message: "Invalid data for reactMessage" });
      }
      const msg = await Message.findById(messageId);
      if (!msg) {
        return socket.emit("errorMessage", { message: "Message not found" });
      }
      const chat = await Chat.findById(msg.chat);
      if (!chat 
          || !chat.participants.map(id=>id.toString()).includes(socket.user._id.toString())
      ) {
        return socket.emit("errorMessage", { message: "Not authorized for reactMessage" });
      }
      const uidStr = socket.user._id.toString();
      const idx = msg.reactions.findIndex(r => r.user.toString()===uidStr);
      if (idx !== -1) {
        if (msg.reactions[idx].emoji === emoji) {
          msg.reactions.splice(idx, 1);
        } else {
          msg.reactions[idx].emoji = emoji;
        }
      } else {
        msg.reactions.push({ user: socket.user._id, emoji });
      }
      await msg.save();
      // Populate reactions
      const populated = await Message.findById(messageId).populate("reactions.user", "name username profilePic");
      io.to(msg.chat.toString()).emit("messageReactionUpdated", {
        messageId,
        reactions: populated.reactions,
        chat: msg.chat.toString()
      });
    } catch (err) {
      console.error("Socket reactMessage error:", err);
      socket.emit("errorMessage", { message: "Reaction failed" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    // Optionally: notify others user went offline
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
