import { useState, useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import axios from "../utils/axiosConfig";
import defaultAvatar from "../assets/defaultpfp.jpg";
import { Send } from "lucide-react";
import { toast } from 'react-toastify';

export default function ChatBotPage() {
  const { isSocketReady } = useChat();
  const bottomRef = useRef(null);
  const [character, setCharacter] = useState("Jethalal");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [acceptedWarning, setAcceptedWarning] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), from: "You", content: input };
    setMessages((m) => [...m, userMsg]);

    try {
      const { data } = await axios.post("/chatbot", {
        userInput: input,
        character,
      });
      const botMsg = {
        id: Date.now() + 1,
        from: character,
        content: data.reply,
      };
      setMessages((m) => [...m, botMsg]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to get response from chatbot");
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, from: character, content: "(Error)" },
      ]);
    }

    setInput("");
  };

  if (!isSocketReady) return <div className="p-4 text-center">Connecting…</div>;

  if (!acceptedWarning) {
    return (
      <div className="h-full flex flex-col justify-center items-center bg-gray-900 text-gray-200 px-6 text-center">
        <h2 className="text-xl font-semibold mb-4">⚠️ Notice before using the chatbot</h2>
        <p className="max-w-md mb-4">
          This conversation will <strong>not be saved</strong>. Please interact respectfully and take care while chatting with AI characters.
        </p>
        <button
          className="btn btn-primary bg-blue-600 hover:bg-blue-500 border-none"
          onClick={() => setAcceptedWarning(true)}
        >
          Start Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white bg-gray-800 flex items-center space-x-3">
        <h2 className="text-lg font-semibold text-white">🤖 Character Chatbot</h2>

        <label className="text-sm text-gray-300 font-medium whitespace-nowrap">
          Talking to:
        </label>
        <input
          className="input input-sm flex-1 max-w-xs bg-gray-700 text-white placeholder-gray-400 border-white"
          value={character}
          onChange={(e) => setCharacter(e.target.value)}
          placeholder="e.g. Donald Trump, Naruto, etc."
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat ${msg.from === "You" ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image">
              {msg.from !== "You" && (
                <img
                  src={defaultAvatar}
                  className="w-8 h-8 rounded-full border border-white"
                />
              )}
            </div>
            <div
              className={`chat-bubble max-w-prose whitespace-pre-wrap ${
                msg.from === "You"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-100"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800 flex items-center space-x-2">
        <input
          className="input flex-1 bg-gray-700 text-white border-white placeholder-gray-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Message ${character}…`}
        />
        <button
          onClick={send}
          className="btn btn-primary btn-square bg-blue-600 hover:bg-blue-500 border-none"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
