import asyncHandler from "express-async-handler";
import Message from "../models/Message.model.js";
import Chat from "../models/Chat.model.js";
import mongoose from "mongoose";

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