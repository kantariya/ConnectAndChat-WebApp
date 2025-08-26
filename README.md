# Connect&Chat – Real-Time Private Chat Application

Connect&Chat is a modern, real-time private chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.io. It focuses on one-to-one conversations, featuring advanced messaging controls, presence indicators, profile management, and an AI-powered Character Bot that lets you chat with custom personas.

🚀 **Live Demo**: https://connectandchat-webapp.onrender.com/

## ✨ Features

### 🔥 Real-Time Private Messaging
- Instant messaging powered by Socket.io.
- Typing indicators to see when another user is writing.
- Seen receipts and last-seen status updates.
- Persistent message history stored in MongoDB.

### 🎨 Rich Message Controls
- React to messages with emojis.
- Reply to specific messages for better context.
- Edit sent messages with appropriate restrictions.
- Unsend a message (deletes for both users).
- Delete for me to hide a message locally.
- Clear chat history for your own account.

### 🤖 AI Character Bot
- Chat with unique AI characters/personas via an external API.
- Easily extensible service layer to add new characters or swap API providers.
- Configuration managed through .env variables.

### 👤 Profile & Account Management
- User profiles with photo upload and update functionality.
- Settings screen with an account deletion option.
- Basic privacy and UI preferences.

### 💎 User Experience
- Clean and responsive React frontend.
- Secure, persistent sessions for a seamless experience.
- Reliable error handling and user feedback.

## 🧱 Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, React Router, Context API |
| Real-Time | Socket.io |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas or local) |
| Auth | JWT / Session-Based Authentication |
| Deployment | Render (or any similar platform) |

## 🗂️ Project Structure

The repository is organized into two main directories:

```
ConnectAndChat-WebApp/
├── chat-backend/  # Node.js + Express + Socket.io API
└── chat-frontend/ # React SPA (Single Page Application)
```

## ⚙️ Environment Variables

Create a `.env` file in both the `chat-backend` and `chat-frontend` directories and add the following variables.

### Backend (chat-backend/.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster/<database>?retryWrites=true&w=majority
JWT_SECRET=your-strong-jwt-secret
CLIENT_ORIGIN=http://localhost:5173
SOCKET_CORS_ORIGIN=http://localhost:5173

# Character Bot API (Optional)
CHARACTER_BOT_API_BASE=https://api.example.com/v1
CHARACTER_BOT_API_KEY=your-api-key
```

### Frontend (chat-frontend/.env)
```
VITE_API_BASE=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🚀 Getting Started

Follow these steps to run the application locally.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ConnectAndChat-WebApp.git
   cd ConnectAndChat-WebApp
   ```

2. **Setup the Backend:**
   ```bash
   cd chat-backend
   npm install
   npm run dev
   ```
   The backend server will start on http://localhost:5000.

3. **Setup the Frontend:**
   Open a new terminal window.
   ```bash
   cd chat-frontend
   npm install
   npm run dev
   ```
   The React development server will start on http://localhost:5173.

## ☁️ Deployment (Render)

This application is designed for easy deployment on platforms like Render.

### Backend (Web Service)
- **Root Directory**: chat-backend
- **Build Command**: npm install
- **Start Command**: npm start
- Add all required environment variables from chat-backend/.env in the Render dashboard.

### Frontend (Static Site)
- **Root Directory**: chat-frontend
- **Build Command**: npm install && npm run build
- **Publish Directory**: dist
- Set the VITE_API_BASE and VITE_SOCKET_URL environment variables to your backend's public Render URL.

## 🔐 Security & Privacy

- Ensure a strong JWT_SECRET is used in production.
- Input validation is in place for file uploads and API endpoints.
- CORS and Socket.io origins are strictly configured for security.
- Client and server secrets are kept separate.

## 🧭 Future Improvements

- Media and file sharing (images, documents).
- Group chat functionality.
- Global message search.
- End-to-end encryption.

## 🤝 Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.
