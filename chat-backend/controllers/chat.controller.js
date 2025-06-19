import asyncHandler from "express-async-handler";
import Chat from "../models/Chat.model.js";
import User from "../models/User.model.js";
import Message from "../models/Message.model.js";

// @desc    Access or create private chat between current user and userId
// @route   POST /api/chats/private/:userId
// @access  Private
export const accessPrivateChat = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const currentUserId = req.user._id.toString();

  if (userId === currentUserId) {
    return res.status(400).json({ message: "Cannot chat with yourself" });
  }
  // Check if user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return res.status(404).json({ message: "User not found" });
  }

  // Try to find existing private chat
  let chat = await Chat.findOne({
    isGroupChat: false,
    participants: { $all: [req.user._id, userId] },
  }).populate("participants", "name username profilePic")
    .populate("latestMessage");

  if (chat) {
    // populate latestMessage.sender if needed
    chat = await User.populate(chat, {
      path: "latestMessage.sender",
      select: "name username profilePic",
    });
    return res.json(chat);
  }

  // Create new private chat
  const chatData = {
    isGroupChat: false,
    participants: [req.user._id, userId],
    name: null,
  };
  const newChat = await Chat.create(chatData);
  const fullChat = await Chat.findById(newChat._id)
    .populate("participants", "name username profilePic");
  return res.status(201).json(fullChat);
});

// @desc    Fetch all chats for logged-in user (private & group), sorted by updatedAt
// @route   GET /api/chats
// @access  Private
export const fetchUserChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  let chats = await Chat.find({
    participants: userId,
  })
    .populate("participants", "name username profilePic")
    .populate("groupAdmins", "name username profilePic")
    .populate({
      path: "latestMessage",
      populate: { path: "sender", select: "name username profilePic" }
    })
    .sort({ updatedAt: -1 });

  res.json(chats);
});

// @desc    Create group chat
// @route   POST /api/chats/group
// @access  Private
// Body: { name: string, userIds: [userId1, userId2, ...] }
// The current user is automatically admin and included
export const createGroupChat = asyncHandler(async (req, res) => {
  const { name, userIds } = req.body;
  if (!name || !Array.isArray(userIds) || userIds.length < 1) {
    return res.status(400).json({ message: "Name and at least one user required" });
  }
  // Ensure all userIds exist
  const participants = [...new Set([req.user._id.toString(), ...userIds])];
  // Optionally check they exist in DB
  // ...
  const newGroup = await Chat.create({
    name,
    isGroupChat: true,
    participants,
    groupAdmins: [req.user._id],
  });
  const fullGroup = await Chat.findById(newGroup._id)
    .populate("participants", "name username profilePic")
    .populate("groupAdmins", "name username profilePic");
  res.status(201).json(fullGroup);
});

// @desc    Rename group chat
// @route   PUT /api/chats/group/rename/:chatId
// @access  Private (only admin)
// Body: { name: string }
export const renameGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "New name required" });

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    return res.status(404).json({ message: "Group chat not found" });
  }
  // Check admin
  if (!chat.groupAdmins.map(id => id.toString()).includes(req.user._id.toString())) {
    return res.status(403).json({ message: "Only admin can rename group" });
  }
  chat.name = name;
  await chat.save();
  const updated = await Chat.findById(chatId)
    .populate("participants", "name username profilePic")
    .populate("groupAdmins", "name username profilePic");
  res.json(updated);
});

// @desc    Add user to group
// @route   PUT /api/chats/group/add/:chatId
// @access  Private (only admin)
// Body: { userId: string }
export const addToGroup = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    return res.status(404).json({ message: "Group chat not found" });
  }
  // Only admin can add
  if (!chat.groupAdmins.map(id => id.toString()).includes(req.user._id.toString())) {
    return res.status(403).json({ message: "Only admin can add to group" });
  }
  if (chat.participants.map(id => id.toString()).includes(userId)) {
    return res.status(400).json({ message: "User already in group" });
  }
  chat.participants.push(userId);
  await chat.save();
  const updated = await Chat.findById(chatId)
    .populate("participants", "name username profilePic")
    .populate("groupAdmins", "name username profilePic");
  res.json(updated);
});

// @desc    Remove user from group
// @route   PUT /api/chats/group/remove/:chatId
// @access  Private (only admin can remove others; user can leave group themselves)
// Body: { userId: string }
export const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    return res.status(404).json({ message: "Group chat not found" });
  }
  const isAdmin = chat.groupAdmins.map(id => id.toString()).includes(req.user._id.toString());
  if (req.user._id.toString() === userId) {
    // User leaving group
    chat.participants = chat.participants.filter(id => id.toString() !== userId);
    // Also remove from admins if present
    chat.groupAdmins = chat.groupAdmins.filter(id => id.toString() !== userId);
  } else {
    // Admin removing someone else
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admin can remove users" });
    }
    chat.participants = chat.participants.filter(id => id.toString() !== userId);
    chat.groupAdmins = chat.groupAdmins.filter(id => id.toString() !== userId);
  }
  await chat.save();
  const updated = await Chat.findById(chatId)
    .populate("participants", "name username profilePic")
    .populate("groupAdmins", "name username profilePic");
  res.json(updated);
});

// @desc    Make another user admin
// @route   PUT /api/chats/group/make-admin/:chatId
// @access  Private (only admin)
// Body: { userId: string }
export const makeGroupAdmin = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    return res.status(404).json({ message: "Group chat not found" });
  }
  // Only existing admin can promote
  if (!chat.groupAdmins.map(id => id.toString()).includes(req.user._id.toString())) {
    return res.status(403).json({ message: "Only admin can promote users" });
  }
  if (chat.groupAdmins.map(id => id.toString()).includes(userId)) {
    return res.status(400).json({ message: "User is already admin" });
  }
  if (!chat.participants.map(id => id.toString()).includes(userId)) {
    return res.status(400).json({ message: "User not in group" });
  }
  chat.groupAdmins.push(userId);
  await chat.save();
  const updated = await Chat.findById(chatId)
    .populate("participants", "name username profilePic")
    .populate("groupAdmins", "name username profilePic");
  res.json(updated);
});
