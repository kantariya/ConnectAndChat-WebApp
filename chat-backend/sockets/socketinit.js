// socket/index.js
import mongoose from "mongoose";
import cookie from "cookie";
import { authenticateSocket } from "../config/socketAuth.js";
import Message from "../models/Message.model.js";
import Chat from "../models/Chat.model.js";
import User from "../models/User.model.js";
import { withinTimeLimit } from "../utils/timeUtils.js";

export function initSocket(io) {
    const onlineUsers = new Map(); // userId → socket.id

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

    io.on("connection", async (socket) => {

        if (process.env.NODE_ENV !== "production") {
            console.log(`Socket connected: ${socket.id}, user: ${socket.user._id}`);
        }

        const uid = socket.user._id.toString();
        onlineUsers.set(uid, socket.id);
        const userChats = await Chat.find({ participants: uid }).select("_id").lean();
        const chatIds = userChats.map(c => c._id.toString());

        // now, instead of io.emit, broadcast only to those rooms:
        chatIds.forEach(chatId => {
            socket.to(chatId).emit("userOnlineStatus", { userId: uid, isOnline: true, lastSeen: socket.user.lastSeen });
        });

        await User.findByIdAndUpdate(uid, { isOnline: true });


        // 2.2. Join/Leave chat rooms
        socket.on("joinChat", (chatId) => {
            // Optionally validate membership
            socket.join(chatId);
            if (process.env.NODE_ENV !== "production") {
                console.log(`User ${socket.user._id} joined chat ${chatId}`);
            }
        });
        socket.on("leaveChat", (chatId) => {
            socket.leave(chatId);
            if (process.env.NODE_ENV !== "production") {
                console.log(`User ${socket.user._id} left chat ${chatId}`);
            }
        });

        // 2.3. sendMessage
        socket.on("sendMessage", async ({ chatId, content, replyTo }) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(chatId) || !content) {
                    return socket.emit("errorMessage", { message: "Invalid data for sendMessage" });
                }

                const chat = await Chat.findById(chatId);
                if (
                    !chat ||
                    !chat.participants.map(id => id.toString()).includes(socket.user._id.toString())
                ) {
                    return socket.emit("errorMessage", { message: "Not authorized to send message to this chat" });
                }

                // Optional: Validate replyTo
                if (replyTo) {
                    if (!mongoose.Types.ObjectId.isValid(replyTo)) {
                        return socket.emit("errorMessage", { message: "Invalid replyTo ID" });
                    }
                    const replyMsg = await Message.findById(replyTo);
                    if (!replyMsg || replyMsg.chat.toString() !== chatId) {
                        return socket.emit("errorMessage", { message: "Cannot reply to that message" });
                    }
                }

                // Create new message
                const newMsg = await Message.create({
                    sender: socket.user._id,
                    chat: chatId,
                    content,
                    replyTo: replyTo || null,
                    readBy: [socket.user._id], // sender has read it
                    deletedFor: [],
                });

                // Update chat.latestMessage
                chat.latestMessage = newMsg._id;
                await chat.save();

                // Populate message for broadcasting
                const populated = await Message.findById(newMsg._id)
                    .populate("sender", "name username profilePic")
                    .populate("replyTo");

                const msgObj = populated.toObject();
                msgObj.fromSelf = true;

                // Emit to sender
                socket.emit("messageSent", msgObj);

                // Emit to others in chat
                socket.to(chatId).emit("messageReceived", {
                    ...msgObj,
                    fromSelf: false
                });

                // 🔥 Get latest lastRead info
                const updatedChat = await Chat.findById(chatId).lean();

                // Emit chatUpdated with lastRead map
                io.to(chatId).emit("chatUpdated", {
                    chatId,
                    latestMessage: msgObj,
                    lastRead: updatedChat.lastRead || {},
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
                if (!withinTimeLimit(msg.createdAt, 6.5 * 60 * 1000)) {
                    return socket.emit("errorMessage", { message: "Edit window expired" });
                }
                msg.content = content;
                msg.isEdited = true;
                await msg.save();

                // Update chat.latestMessage if this is the latest message
                const chat = await Chat.findById(msg.chat);
                if (chat.latestMessage?.toString() === msg._id.toString()) {
                    chat.latestMessage = msg._id; // already edited
                    await chat.save();
                }

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
                if (Date.now() - createdTime > 6.5 * 60 * 1000) {
                    return socket.emit("errorMessage", { message: "Unsend window expired" });
                }
                const chatId = msg.chat.toString();

                const chat = await Chat.findById(chatId);
                const wasLatest = chat.latestMessage?.toString() === msg._id.toString();

                // Delete the message
                await Message.findByIdAndDelete(messageId);

                // If latest was deleted, update chat.latestMessage
                if (wasLatest) {
                    const latestVisible = await Message.find({ chat: chatId })
                        .sort({ createdAt: -1 })
                        .limit(1); // next latest

                    chat.latestMessage = latestVisible[0]?._id || null;
                    await chat.save();
                }


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
                    || !chat.participants.map(id => id.toString()).includes(socket.user._id.toString())
                ) {
                    return socket.emit("errorMessage", { message: "Not authorized to deleteForMe" });
                }
                const userIdStr = socket.user._id.toString();
                // If already in deletedFor, ignore
                if (!msg.deletedFor.map(id => id.toString()).includes(userIdStr)) {
                    msg.deletedFor.push(socket.user._id);
                    await msg.save();
                }
                // Notify only this user: so on frontend filter out message
                socket.emit("messageDeletedForMe", { messageId, chat: msg.chat.toString() });

                // Now: if all participants have deletedFor
                const allIds = chat.participants.map(id => id.toString());
                const delForIds = msg.deletedFor.map(id => id.toString());
                const allDeleted = allIds.every(id => delForIds.includes(id));
                if (allDeleted) {
                    // Delete from DB
                    await Message.findByIdAndDelete(messageId);
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
                    || !chat.participants.map(id => id.toString()).includes(socket.user._id.toString())
                ) {
                    return socket.emit("errorMessage", { message: "Not authorized for messageSeen" });
                }
                const userIdStr = socket.user._id.toString();
                if (!msg.readBy.map(id => id.toString()).includes(userIdStr)) {
                    msg.readBy.push(socket.user._id);
                    await msg.save();
                }
                // Broadcast to all in chat that this user has seen messageId
                io.to(chatId).emit("messageSeen", { messageId, userId: userIdStr, chatId });
            } catch (err) {
                console.error("Socket messageSeen error:", err);
                socket.emit("errorMessage", { message: "messageSeen failed" });
            }
        });

        // 2.8. typing / stopTyping
        socket.on("typing", ({ chatId }) => {
            if (!chatId) return;
            socket.to(chatId).emit("typing", { userId: socket.user._id.toString(), chatId });
        });
        socket.on("stopTyping", ({ chatId }) => {
            if (!chatId) return;
            socket.to(chatId).emit("stopTyping", { userId: socket.user._id.toString(), chatId });
        });

        // 2.9. clearChat (per-user; update Chat.clearedAt; if all cleared, delete old messages)
        socket.on("clearChat", async ({ chatId }) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(chatId)) {
                    return socket.emit("errorMessage", { message: "Invalid chatId for clearChat" });
                }
                const chat = await Chat.findById(chatId);
                if (!chat
                    || !chat.participants.map(id => id.toString()).includes(socket.user._id.toString())
                ) {
                    return socket.emit("errorMessage", { message: "Not authorized for clearChat" });
                }
                const now = new Date();
                chat.clearedAt.set(socket.user._id.toString(), now);
                await chat.save();
                // Notify this user to clear UI
                socket.emit("chatCleared", { chatId, clearedAt: now });

                // If all participants have cleared:
                const parts = chat.participants.map(id => id.toString());
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
                    //reset chat.clearedAt? future messages should accumulate from now on.
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
                    || !chat.participants.map(id => id.toString()).includes(socket.user._id.toString())
                ) {
                    return socket.emit("errorMessage", { message: "Not authorized for reactMessage" });
                }
                const uidStr = socket.user._id.toString();
                const idx = msg.reactions.findIndex(r => r.user.toString() === uidStr);
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

        socket.on("markAsRead", async ({ chatId }) => {
            try {
                // update only this user’s lastRead timestamp
                await Chat.findByIdAndUpdate(
                    chatId,
                    { $set: { [`lastRead.${socket.user._id}`]: new Date() } }
                );
                // let that client know we’ve persisted it
                socket.emit("chatRead", { chatId });
            } catch (err) {
                console.error("markAsRead error:", err);
            }
        });

        socket.on("disconnect", async () => {
            const uid = socket.user?._id.toString();
            if (uid) {
                onlineUsers.delete(uid);
                // persist lastSeen
                const now = new Date();
                await User.findByIdAndUpdate(uid, { lastSeen: now, isOnline: false });
                const userChats = await Chat.find({ participants: uid }).select("_id").lean();
                userChats.forEach(c => {
                    socket.to(c._id.toString()).emit("userOnlineStatus", {
                        userId: uid,
                        isOnline: false,
                        lastSeen: now,
                    });
                });
            }
            console.log(`Socket disconnected: ${socket.id}`);
        });

    });
}
