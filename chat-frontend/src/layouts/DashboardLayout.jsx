import ChatListSidebar from "../components/ChatListSidebar";
import ChatWindow from "../components/ChatWindow";

const DashboardLayout = ({ users }) => {
  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden">
      <ChatListSidebar users={users}/>
      <ChatWindow />
    </div>
  );
};

export default DashboardLayout;
