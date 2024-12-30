export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  chatRoomId: string;
  createdAt: Date;
}
