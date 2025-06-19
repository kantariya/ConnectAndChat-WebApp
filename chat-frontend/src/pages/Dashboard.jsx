import { useChat } from "../context/ChatContext";
import { useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

const Dashboard = () => {
  const { fetchChats } = useChat();

  useEffect(() => {
    fetchChats();
  }, []);

  return <DashboardLayout />;
};

export default Dashboard;
