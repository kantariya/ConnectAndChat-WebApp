import asyncHandler from 'express-async-handler';
import User from '../models/User.model.js';

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, username, email, profilePic } = req.body;

  if (username && username !== user.username) {
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error('Username already taken');
    }
    user.username = username;
  }

  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error('Email already in use');
    }
    user.email = email;
  }

  user.name = name || user.name;
  user.profilePic = profilePic || user.profilePic;

  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    name: updatedUser.name,
    username: updatedUser.username,
    email: updatedUser.email,
    profilePic: updatedUser.profilePic,
  });
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
    res.status(404);
    throw new Error('User or friend not found');
  }

  user.friends = user.friends.filter(
    (f) => f.toString() !== friendId.toString()
  );
  friend.friends = friend.friends.filter(
    (f) => f.toString() !== userId.toString()
  );

  await user.save();
  await friend.save();

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
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(user.friends);
});


// @desc    Get all users except the current logged-in one
// @route   GET /api/users
// @access  Private
export const getAllUsers = async (req, res) => {
  try {

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password') // exclude password
      .lean();

    res.status(200).json({ users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};


export const getQueriedUser = async (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).json({ error: "Username query missing" });

    const users = await User.find({
        username: { $regex: username, $options: "i" },
        _id: { $ne: req.user._id } // exclude self
    }).select("_id name username profilePhoto");

    res.json(users);
};
