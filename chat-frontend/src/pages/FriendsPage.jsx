import ChatWindow from "../components/ChatWindow";
import FriendSidebar from "../components/FriendSidebar";

const FriendsPage = () => {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <FriendSidebar />
      <ChatWindow  className="hidden md:block"/>
    </div>
  );
};

export default FriendsPage;
