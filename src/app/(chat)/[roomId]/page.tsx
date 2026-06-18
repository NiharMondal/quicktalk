import ChatWindow from "@/components/chat/ChatWindow";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function RoomPage({ params }: RoomPageProps): Promise<React.ReactElement> {
  const { roomId } = await params;
  return <ChatWindow roomId={roomId} />;
}
