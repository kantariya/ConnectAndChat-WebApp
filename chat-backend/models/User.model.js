import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    username: {
      type: String,
      required: true,
      unique: true,
      index: true, //  For efficient search and login
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true, //  For login and duplicate check
      trim: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    profilePic: { type: String, default: "" }, 

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
