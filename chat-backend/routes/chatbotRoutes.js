import express from "express";
import {
  getBotReply
} from "../controllers/chatbot.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/").post(protect,getBotReply);

export default router;