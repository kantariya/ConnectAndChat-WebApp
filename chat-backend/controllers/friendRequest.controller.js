import FriendRequest from '../models/friendRequest.model.js';
import User from '../models/User.model.js';
import asyncHandler from 'express-async-handler';

// POST /api/friends/send/:userId
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const from = req.user._id;
  const to = req.params.userId;

  if (from.toString() === to) {
    res.status(400);
    throw new Error("You cannot send a request to yourself.");
  }

  const recipient = await User.findById(to);
  if (!recipient) {
    res.status(404);
    console.log("Recipient user not found.");
    throw new Error("Recipient user not found.");
  }

  const existingRequest = await FriendRequest.findOne({ from, to });
  if (existingRequest) {
    res.status(400);
    console.log("Friend request already sent.");
    throw new Error("Friend request already sent.");
  }

  const friendRequest = await FriendRequest.create({ from, to });
  res.status(201).json(friendRequest);
});

// DELETE /api/friends/cancel/:requestId
export const cancelFriendRequest = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findById(req.params.requestId);

  if (!request || request.from.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error("Friend request not found or unauthorized.");
  }

  await request.deleteOne();
  res.status(200).json({ message: "Friend request cancelled." });
});

// PUT /api/friends/respond/:requestId
export const respondToFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  const request = await FriendRequest.findById(requestId);

  if (!request) {
    res.status(404);
    throw new Error("Friend request not found");
  }

  if (request.to.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to respond to this request");
  }

  if (status === "rejected") {
    await request.deleteOne();
    return res.status(200).json({ message: "Friend request rejected and deleted" });
  }

  request.status = status;
  await request.save();
  const fromUser = await User.findById(request.from);
  if (!fromUser) {
    res.status(404);
    throw new Error("Sender user not found");
  }
  const toUser = await User.findById(request.to);
  if (!toUser) {
    res.status(404);
    throw new Error("Recipient user not found");
  }

  // Add each other as friends
  fromUser.friends.push(toUser._id);
  toUser.friends.push(fromUser._id);
  await fromUser.save();
  await toUser.save();
  // Delete the friend request 
  await request.deleteOne();

  return res.status(200).json({ message: "Friend request accepted" });
});


export const getSentFriendRequests = asyncHandler(async (req, res) => {
  const requests = await FriendRequest.find({ from: req.user._id })
    .populate("to", "username name profilePic")
    .sort({ createdAt: -1 });

  res.status(200).json(requests);
});


export const getReceivedFriendRequests = asyncHandler(async (req, res) => {
  const requests = await FriendRequest.find({ to: req.user._id, status: "pending" })
    .populate("from", "username name profilePic")
    .sort({ createdAt: -1 });

  res.status(200).json(requests);
});

