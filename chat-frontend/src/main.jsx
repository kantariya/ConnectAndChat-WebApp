// Disable certain console methods in production
if (import.meta.env.MODE === "production") {
  // console.log = () => {};
  // console.debug = () => {};
  // console.warn = () => {};
  // console.error = () => {};
}


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ChatProvider } from "./context/ChatContext";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
    <ToastContainer />
  </StrictMode>,
)
