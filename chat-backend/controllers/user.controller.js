import asyncHandler from 'express-async-handler';
import User from '../models/User.model.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import bcrypt from "bcryptjs";
import Message from '../models/Message.model.js';
import Chat from '../models/Chat.model.js';
import FriendRequest from '../models/FriendRequest.model.js';


// @desc    Get current user's profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res) => {
  // req.user is populated by protect middleware
  const user = await User.findById(req.user._id).select('-password'); // exclude password
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});



// @desc    Update current user's profile (name and/or profilePic)
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.body.name) {
    user.name = req.body.name.trim();
  }

  // If file uploaded, delete old pic and upload new one
  if (req.file) {
    //  Delete old image from Cloudinary if exists
    if (user.profilePicId) {
      try {
        await cloudinary.v2.uploader.destroy(user.profilePicId);
      } catch (err) {
        console.warn('Failed to delete old Cloudinary image:', err.message);
      }
    }

    //  Upload new profile image
    const uploadFromBuffer = (buffer) =>
      new Promise((resolve, reject) => {
        const cld_upload_stream = cloudinary.v2.uploader.upload_stream(
          {
            folder: 'profile_pics',
            transformation: [{ width: 500, height: 500, crop: 'limit' }],
            resource_type: 'image',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(buffer).pipe(cld_upload_stream);
      });

    try {
      const result = await uploadFromBuffer(req.file.buffer);
      user.profilePic = result.secure_url;
      user.profilePicId = result.public_id; //  Store public_id for deletion next time
    } catch (err) {
      return res.status(500).json({ message: 'Image upload failed' });
    }
  }

  await user.save();
  const updatedUser = await User.findById(userId).select('-password');
  res.json(updatedUser);
});



export const removeProfilePicture = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || !user.profilePic) {
    return res.status(400).json({ message: "No profile picture to remove" });
  }

  // Delete from Cloudinary using stored profilePicId
  if (user.profilePicId) {
    try {
      await cloudinary.v2.uploader.destroy(user.profilePicId);
    } catch (err) {
      console.warn('Failed to delete Cloudinary image:', err.message);
    }
  }

  user.profilePic = "";
  user.profilePicId = "";
  await user.save();

  const updatedUser = await User.findById(req.user._id).select("-password");
  res.json(updatedUser);
});




export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) return res.status(401).json({ message: "Incorrect old password" });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  res.json({ message: "Password updated successfully" });
});





// @desc    Remove a friend
// @route   DELETE /api/users/remove-friend/:friendId
// @access  Private
export const removeFriend = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const friendId = req.params.friendId;

  const user = await User.findById(userId);
  const friend = await User.findById(friendId);

  if (!user || !friend) {
    return res.status(404).json({ message: 'User or friend not found' });
  }

  user.friends = user.friends.filter(
    (f) => f.toString() !== friendId.toString()
  );
  friend.friends = friend.friends.filter(
    (f) => f.toString() !== userId.toString()
  );

  await user.save();
  await friend.save();

  //Find the private chat that only has these two participants
  const privateChat = await Chat.findOne({
    isGroupChat: false,
    participants: { $all: [userId, friendId] },
  });

  if (privateChat) {
    // delete all messages in this private chat
    if (privateChat) {
      await Message.deleteMany({ chat: privateChat._id });
    }
    // Delete the chat
    await privateChat.deleteOne();
  }
  else {
    console.warn(`No private chat found for these users : ${userId} & ${friendId}, skipping deletion`);
  }

  res.status(200).json({ message: 'Friend removed successfully' });
});

// @desc    Get current user's friends list
// @route   GET /api/users/friends
// @access  Private
export const getFriendsList = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'friends',
    'username name profilePic'
  );

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  res.status(200).json(user.friends);
});


export const getQueriedUser = asyncHandler(async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: "Username query missing" });

  const users = await User.find({
    username: { $regex: username, $options: "i" },
    _id: { $ne: req.user._id } // exclude self
  }).select("_id name username profilePhoto");

  res.json(users);
});


export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const userId = user._id;

  // 1. Delete profile picture from Cloudinary
  if (user.profilePicId) {
    try {
      await cloudinary.v2.uploader.destroy(user.profilePicId);
    } catch (err) {
      console.warn("Cloudinary deletion failed:", err.message);
    }
  }

  // 2. Remove user from all chats
  const chats = await Chat.find({ participants: userId });
  for (const chat of chats) {
    chat.participants.pull(userId);
    chat.groupAdmins?.pull(userId);
    chat.clearedAt?.delete(userId.toString());

    const isGroup = chat.isGroupChat;
    const remainingParticipants = chat.participants.length;

    if (!isGroup || remainingParticipants === 0) {
      // Delete private chat or empty group
      await Chat.findByIdAndDelete(chat._id); // triggers pre-delete to clean messages
    } else {
      await chat.save();
    }
  };

  // 3. Now cleanup remaining message references
  await Message.updateMany(
    { reactions: { $elemMatch: { user: userId } } },
    { $pull: { reactions: { user: userId } } }
  );
  await Message.updateMany({ readBy: userId }, { $pull: { readBy: userId } });
  await Message.updateMany({ deletedFor: userId }, { $pull: { deletedFor: userId } });

  // 4. Delete all friend requests involving this user
  await FriendRequest.deleteMany({
    $or: [{ from: userId }, { to: userId }]
  });

  // 5. Remove user from other users' friend lists
  await User.updateMany(
    { friends: userId },
    { $pull: { friends: userId } }
  );


  // 6. Delete user document
  await user.deleteOne();

  // 7. Clear auth cookie
  res.clearCookie("token");

  res.json({ message: "Account and associated data deleted successfully" });
});


export const findStatus = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("lastSeen isOnline");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ isOnline: user?.isOnline, lastSeen: user?.lastSeen });
  } catch (err) {
    res.status(500).json({ message: "Failed to get status" });
  }
});