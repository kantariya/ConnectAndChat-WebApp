// utils/socketUpload.js
import { v2 as cloudinary } from "../config/cloudinary.js";
import streamifier from "streamifier";
import Message from "../models/Message.model.js";
import Chat from "../models/Chat.model.js";

export const uploadBufferToCloudinary = (buffer, fileName, mimeType) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "chat_media",
        resource_type: mimeType.startsWith("video") ? "video" : "auto",
        public_id: `${Date.now()}-${fileName}`,
      },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
