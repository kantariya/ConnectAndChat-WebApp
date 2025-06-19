import express from "express";
import {
  accessPrivateChat,
  fetchUserChats,
  createGroupChat,
  renameGroupChat,
  addToGroup,
  removeFromGroup,
  makeGroupAdmin
} from "../controllers/chat.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/").get(protect, fetchUserChats);
router.route("/private/:userId").post(protect, accessPrivateChat);
router.route("/group").post(protect, createGroupChat);
router.route("/group/rename/:chatId").put(protect, renameGroupChat);
router.route("/group/add/:chatId").put(protect, addToGroup);
router.route("/group/remove/:chatId").put(protect, removeFromGroup);
router.route("/group/make-admin/:chatId").put(protect, makeGroupAdmin);

export default router;
