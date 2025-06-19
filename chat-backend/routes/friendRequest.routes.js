import express from 'express';
import {
  sendFriendRequest,
  cancelFriendRequest,
  respondToFriendRequest,
  getSentFriendRequests,
  getReceivedFriendRequests,
} from '../controllers/friendRequest.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Send a friend request
// POST /api/friends/send/:userId
router.post('/send/:userId', protect, sendFriendRequest);

// Cancel a sent friend request
// DELETE /api/friends/cancel/:requestId
router.delete('/cancel/:requestId', protect, cancelFriendRequest);

// Respond to a received friend request (accept/reject)
// PUT /api/friends/respond/:requestId
router.put('/respond/:requestId', protect, respondToFriendRequest);

// Get sent friend requests
// GET /api/friends/sent
router.get('/sent', protect, getSentFriendRequests);

// Get received friend requests
// GET /api/friends/received
router.get('/received', protect, getReceivedFriendRequests);

export default router;
