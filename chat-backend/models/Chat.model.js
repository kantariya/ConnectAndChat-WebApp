// models/Chat.model.js
import mongoose from "mongoose";
import Message from "./Message.model.js";

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
  lastRead: {
    type: Map,
    of: Date,
    default: {}
  },
}, { timestamps: true });

chatSchema.index({ participants: 1 });


// Delete all messages when a chat is deleted
// NOTE: This middleware will NOT run if Chat is deleted via deleteOne() or deleteMany()
chatSchema.pre("findOneAndDelete", async function (next) {
  try {
    const chat = await this.model.findOne(this.getQuery());
    if (chat) {
      await Message.deleteMany({ chat: chat._id });
    }
    next();
  } catch (err) {
    next(err);
  }
});

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
