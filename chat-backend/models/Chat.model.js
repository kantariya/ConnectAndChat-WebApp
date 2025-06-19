// models/Chat.model.js
import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  name: String, // for group
  isGroupChat: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  groupAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  groupImage: { type: String, default: "" },
  latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  // clearedAt: map userId -> Date when that user cleared chat
  clearedAt: {
    type: Map,
    of: Date,
    default: {}
  },
}, { timestamps: true });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
