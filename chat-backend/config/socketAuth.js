import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

// Returns user document or throws
export const authenticateSocket = async (token) => {
  if (!token) throw new Error("No token provided");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new Error("User not found");
    return user;
  } catch (err) {
    throw new Error("Socket authentication failed: " + err.message);
  }
};
