import express from 'express';
import {
  updateUserProfile,
  removeFriend,
  getFriendsList,
  getAllUsers,
  getQueriedUser,
} from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Update user profile
// PUT /api/users/profile
router.put('/profile', protect, updateUserProfile);

// Remove a friend
// DELETE /api/users/remove-friend/:friendId
router.delete('/remove-friend/:friendId', protect, removeFriend);

// Get friends list
// GET /api/users/friends
router.get('/friends', protect, getFriendsList);

router.get('/', protect, getAllUsers);

router.get('/search', protect, getQueriedUser)

export default router;
