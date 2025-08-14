import ChatWindow from "../components/ChatWindow";
import FriendSidebar from "../components/FriendSidebar";

const FriendsPage = () => {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <FriendSidebar />
      <ChatWindow/>
    </div>
  );
};

export default FriendsPage;
