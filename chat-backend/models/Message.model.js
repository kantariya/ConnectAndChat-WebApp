// models/Message.model.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  chat:   { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  content: { type: String, required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  isEdited: { type: Boolean, default: false },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: String,
  }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
