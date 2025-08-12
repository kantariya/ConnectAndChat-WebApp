import dotenv from "dotenv";
dotenv.config();

import asyncHandler from "express-async-handler";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory session store (replace with DB for production)
const sessions = new Map();

export const getBotReply = asyncHandler(async (req, res) => {
  try {
    const { userInput, character } = req.body;
    const sessionId = req.user._id + "_" + character;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let chat;
    if (sessions.has(sessionId)) {
      chat = sessions.get(sessionId);
    } else {
      const context = `
You are the fictional character ${character}.
Always stay in character and respond exactly as ${character} would speak.
Do NOT say you're an AI or language model.
Avoid modern references, break-the-fourth-wall behavior, or factual corrections.
Even when asked directly, do not reveal you are artificial.
      `.trim();

      chat = model.startChat({
        history: [],
        context,
      });

      sessions.set(sessionId, chat);
    }

    // Force persona in prompt — Gemini needs reinforcement every time
    const personaPrompt = `
You are the fictional character ${character}.
Never say you are an AI.
Always stay in character in tone and style.

Human: ${userInput}
    `.trim();

    const result = await chat.sendMessage(personaPrompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: "Chatbot failure" });
  }
});
