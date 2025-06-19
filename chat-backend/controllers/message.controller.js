import asyncHandler from "express-async-handler";
import Message from "../models/Message.model.js";
import Chat from "../models/Chat.model.js";
import mongoose from "mongoose";
import { withinTimeLimit } from "../utils/timeUtils.js";

// @desc    Fetch messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
// controllers/message.controller.js
export const fetchMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chat ID" });
  }
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.map(id=>id.toString()).includes(req.user._id.toString())) {
    return res.status(403).json({ message: "Not authorized to view messages" });
  }
  // Determine clearedAt for this user
  let clearedAtDate = null;
  if (chat.clearedAt && chat.clearedAt.get(req.user._id.toString())) {
    clearedAtDate = chat.clearedAt.get(req.user._id.toString());
  }
  // Fetch all messages in chat
  let msgs = await Message.find({ chat: chatId })
    .sort({ createdAt: 1 })
    .populate("sender", "name username profilePic")
    .populate("replyTo")
    .lean();
  // Filter out deletedFor this user and messages older or equal to clearedAt
  msgs = msgs.filter(m => {
    if (m.deletedFor && m.deletedFor.some(u => u.toString() === req.user._id.toString())) {
      return false;
    }
    if (clearedAtDate && new Date(m.createdAt) <= new Date(clearedAtDate)) {
      return false;
    }
    return true;
  });
  // Append fromSelf and readBy array
  msgs = msgs.map(m => ({
    ...m,
    fromSelf: m.sender._id.toString() === req.user._id.toString(),
    readBy: m.readBy || [],
  }));
  res.json(msgs);
});


// @desc    Send a message (private or group)
// @route   POST /api/messages/send
// @access  Private
// Body: { chatId: string, content: string, replyTo?: messageId }
export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content, replyTo } = req.body;
  if (!content || !chatId) {
    return res.status(400).json({ message: "chatId and content are required" });
  }
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chat ID" });
  }
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.map(id => id.toString()).includes(req.user._id.toString())) {
    return res.status(403).json({ message: "Not authorized to send message to this chat" });
  }
  // If replyTo provided, ensure the message exists and in same chat
  let replyMsg = null;
  if (replyTo) {
    if (!mongoose.Types.ObjectId.isValid(replyTo)) {
      return res.status(400).json({ message: "Invalid replyTo ID" });
    }
    replyMsg = await Message.findById(replyTo);
    if (!replyMsg || replyMsg.chat.toString() !== chatId) {
      return res.status(400).json({ message: "Cannot reply to that message" });
    }
  }
  const newMessage = await Message.create({
    sender: req.user._id,
    chat: chatId,
    content,
    replyTo: replyTo || null,
  });
  // Update latestMessage in Chat
  chat.latestMessage = newMessage._id;
  await chat.save();

  // Populate fields to return
  let fullMsg = await Message.findById(newMessage._id)
    .populate("sender", "name username profilePic")
    .populate("replyTo");
  // Add fromSelf
  fullMsg = fullMsg.toObject();
  fullMsg.fromSelf = true;

  res.status(201).json(fullMsg);
});

// @desc    Edit a message (only before 6.5 minutes)
// @route   PUT /api/messages/edit/:messageId
// @access  Private
// Body: { content: string }
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: "New content required" });
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({ message: "Invalid message ID" });
  }
  const msg = await Message.findById(messageId);
  if (!msg) return res.status(404).json({ message: "Message not found" });
  if (msg.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to edit this message" });
  }
  // Check time limit: 6.5 minutes = 6.5*60*1000 = 390000 ms
  if (!withinTimeLimit(msg.createdAt, 390000)) {
    return res.status(400).json({ message: "Edit time window expired" });
  }
  msg.content = content;
  msg.isEdited = true;
  await msg.save();
  const updated = await Message.findById(messageId).populate("sender", "name username profilePic");
  const responseMsg = updated.toObject();
  responseMsg.fromSelf = true;
  res.json(responseMsg);
});

// @desc    Unsend a message (only before 6.5 minutes)
// @route   DELETE /api/messages/unsend/:messageId
// @access  Private
export const unsendMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({ message: "Invalid message ID" });
  }

  const msg = await Message.findById(messageId);
  if (!msg) return res.status(404).json({ message: "Message not found" });

  if (msg.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to unsend this message" });
  }

  if (!withinTimeLimit(msg.createdAt, 390000)) {
    return res.status(400).json({ message: "Unsend time window expired" });
  }

  const chatId = msg.chat?.toString(); // Extract chatId before deleting
  await Message.findByIdAndDelete(messageId);

  // Emit to socket if chatId and io are available
  if (chatId && req.io) {
    req.io.to(chatId).emit("messageUnsent", { messageId, chat: chatId });
  }

  return res.status(200).json({ message: "Message deleted successfully" });
});

// @desc    React to a message (toggle or add reaction)
// @route   POST /api/messages/react/:messageId
// @access  Private
// Body: { emoji: string }
export const reactMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ message: "Emoji required" });
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({ message: "Invalid message ID" });
  }
  const msg = await Message.findById(messageId);
  if (!msg) return res.status(404).json({ message: "Message not found" });
  // Check if user already reacted with same emoji
  const existingIndex = msg.reactions.findIndex(r => r.user.toString() === req.user._id.toString());
  if (existingIndex !== -1) {
    // If same emoji, remove reaction; else update emoji
    if (msg.reactions[existingIndex].emoji === emoji) {
      msg.reactions.splice(existingIndex, 1);
    } else {
      msg.reactions[existingIndex].emoji = emoji;
    }
  } else {
    msg.reactions.push({ user: req.user._id, emoji });
  }
  await msg.save();
  // Return updated reactions
  const populated = await Message.findById(messageId)
    .populate("reactions.user", "name username profilePic");
  res.json(populated.reactions);
});
