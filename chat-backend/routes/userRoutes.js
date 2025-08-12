import express from 'express';
import {
  updateProfile,
  getProfile,
  removeProfilePicture,
  removeFriend,
  getFriendsList,
  getQueriedUser,
  changePassword,
  deleteAccount,
  findStatus,
} from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import  { upload } from '../middlewares/uploadMiddleware.js';
import { handleMulterUpload } from '../middlewares/handleMulterError.js';

const router = express.Router();

// GET current user's profile
router.get('/profile', protect, getProfile);

// Update user profile
// PUT /api/users/profile
// Update profile: name and/or picture. Expect multipart/form-data with optional field "profilePic", and optional "name".
router.put(
  '/profile',
  protect,
  handleMulterUpload('profilePic', upload),
  updateProfile
);

// Remove profile picture
// DELETE /api/users/removeProfilePic
router.delete('/removeProfilePic', protect, removeProfilePicture);



// Remove a friend
// DELETE /api/users/remove-friend/:friendId
router.delete('/remove-friend/:friendId', protect, removeFriend);

// Get friends list
// GET /api/users/friends
router.get('/friends', protect, getFriendsList);

router.get('/search', protect, getQueriedUser)

router.put("/changePassword", protect, changePassword);

router.delete("/deleteAccount", protect, deleteAccount);

router.get('/status/:id',protect, findStatus);


export default router;
