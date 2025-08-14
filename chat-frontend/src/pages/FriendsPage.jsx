import ChatWindow from "../components/ChatWindow";
import FriendSidebar from "../components/FriendSidebar";

const FriendsPage = () => {
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      <div>
        <FriendSidebar className="flex-1" />
      </div>
      <div className="hidden md:block flex-1">
        <ChatWindow />
      </div>
    </div>
  );
};

export default FriendsPage;
