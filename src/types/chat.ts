// 🔹 TYPE DEFINITIONS
export interface Message {
  id?: number;
  room_id: string;
  user_id: string;
  message: string;
  status: number; // 0 = unread, 1 = read
  created_at: string;
  parent_id?: number;
  parent_message?: string;
  parent_user_id?: string;
  temporary?: boolean;
}

export interface UnreadCountData {
  total_unread: number;
  unread_per_room: {
    room_id: string;
    unread_count: number;
  }[];
}

export interface ChatRoom {
  room_id: string;
  is_group: boolean;
  room_created: string; // waktu dibuat room
  email?: string; // untuk private chat
  full_name?: string; // nama lawan atau group
  unread: number; // jumlah pesan belum dibaca
  last_message?: string; // isi last message
  last_message_type?: string; // tipe last message ('text', 'image', 'document', dll)
  last_message_created_at?: string; // waktu last message
  last_message_user_id?: string; // pengirim last message
  last_message_status?: number; // status last message
}

export interface Contact {
  user_id: string | null; // null untuk group chat
  room_id: string;
  name: string | null; // full_name
  email: string | null; // email lawan (private)
  unread: number; // jumlah pesan belum dibaca
  last_activity: string | null; // waktu last message atau room_created
  is_group: boolean;
  last_message?: string; // isi last message
  last_message_type?: string; // tipe last message
}

export interface ChatState {
  searchQuery: string;
  roomId: string;
  message: string;
  messages: Message[];
  chatRooms: ChatRoom[];
  contacts: Contact[];
  activeRoom: string;
  showAddContactModal: boolean;
  replyingTo: Message | null;
  isLoading: boolean;
}

export type ChatAction =
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_ROOM_ID"; payload: string }
  | { type: "SET_MESSAGE"; payload: string }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "SET_CHAT_ROOMS"; payload: ChatRoom[] }
  | { type: "SET_CONTACTS"; payload: Contact[] }
  | { type: "SET_ACTIVE_ROOM"; payload: string }
  | { type: "SET_SHOW_ADD_CONTACT_MODAL"; payload: boolean }
  | { type: "SET_REPLYING_TO"; payload: Message | null }
  | { type: "SET_LOADING"; payload: boolean };
