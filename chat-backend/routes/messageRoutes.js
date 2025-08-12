import express from "express";
import {
  fetchMessages
} from "../controllers/message.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/:chatId").get(protect, fetchMessages);

export default router;
