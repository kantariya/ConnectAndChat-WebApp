import express from "express";
import {
  fetchMessages,
  sendMessage,
  editMessage,
  unsendMessage,
  reactMessage
} from "../controllers/message.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/:chatId").get(protect, fetchMessages);
router.route("/send").post(protect, sendMessage);
router.route("/edit/:messageId").put(protect, editMessage);
router.route("/unsend/:messageId").delete(protect, unsendMessage);
router.route("/react/:messageId").post(protect, reactMessage);

export default router;
