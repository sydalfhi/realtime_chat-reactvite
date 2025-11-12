import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { socket } from "../utils/socket";
import { Message, ChatRoom, Contact } from "../types/chat";
import { formatRoomsToContacts, handleChatError } from "../utils/chatHelpers";

export const useChat = () => {
  const { user } = useAuthStore();

  // STATE MANAGEMENT
  const [searchQuery, setSearchQuery] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeRoom, setActiveRoom] = useState("");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔹 FIX: Gunakan useCallback dengan dependencies yang tepat
  const loadChatRooms = useCallback(() => {
    if (user) {
      console.log("🔄 Loading chat rooms...");
      socket.emit("chat:get-rooms", { user_id: user.id });
    }
  }, [user]); // ✅ Hanya depend on user

  const loadMessages = useCallback(
    (roomId: string) => {
      if (user) {
        console.log("🔄 Loading messages for room:", roomId);
        setIsLoading(true);
        socket.emit("chat:get-messages", {
          room_id: roomId,
          user_id: user.id,
        });

        // Mark as read
        setTimeout(() => {
          socket.emit("chat:mark-read", {
            room_id: roomId,
            user_id: user.id,
          });
          setIsLoading(false);
        }, 100);
      }
    },
    [user]
  ); // ✅ Hanya depend on user

  const sendMessage = useCallback(() => {
    if (user && roomId && message.trim()) {
      console.log("📤 Sending message:", { roomId, message });
      const messageData = {
        user_id: user.id,
        room_id: roomId,
        message: message.trim(),
        parent_id: replyingTo?.parent_id,
      };

      socket.emit("chat:send", messageData);
      setMessage("");
      setReplyingTo(null);
    }
  }, [user, roomId, message, replyingTo]); // ✅ Dependencies jelas

  const selectContact = useCallback(
    (contact: Contact) => {
      console.log("👤 Selecting contact:", contact);
      setRoomId(contact.room_id);
      setActiveRoom(contact.room_id);
      socket.emit("chat:join", { room_id: contact.room_id });
      loadMessages(contact.room_id);
      setSearchQuery("");
      setReplyingTo(null);
    },
    [loadMessages]
  ); // ✅ Hanya depend on loadMessages

  // 🔹 FIX: Socket event handlers yang stabil
  useEffect(() => {
    if (!user) return;

    console.log("🔌 Connecting socket...");
    socket.connect();

    const handleChatReceive = (data: Message) => {
      console.log("📨 Received message:", data);

      // Jika message memiliki parent_id, cari data parentnya di messages sebelumnya
      if (data.parent_id) {
        setMessages((prev) => {
          // Cari parent message dari messages sebelumnya
          const parentMessage = prev.find((msg) => msg.id === data.parent_id);

          // Jika parent message ditemukan, tambahkan data parent ke message baru
          if (parentMessage) {
            const enhancedData = {
              ...data,
              parent_message: parentMessage.message,
              parent_user_id: parentMessage.user_id,
            };
            return [...prev, enhancedData];
          }

          // Jika tidak ditemukan, return data asli
          return [...prev, data];
        });
      } else {
        // Jika tidak ada parent_id, langsung tambahkan message
        setMessages((prev) => [...prev, data]);
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    const handleChatStarted = (data: any) => {
      console.log("🚀 Chat started:", data);
      if (data.room_id) {
        setRoomId(data.room_id);
        setActiveRoom(data.room_id);
        socket.emit("chat:join", { room_id: data.room_id });
        loadMessages(data.room_id);
        loadChatRooms();
        setShowAddContactModal(false);
      }
    };

    const handleChatMessages = (data: any) => {
      console.log("📜 Received messages:", data);
      if (data.messages) {
        setMessages(data.messages);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    const handleChatRooms = (data: any) => {
      console.log("👥 Received rooms:", data);
      if (Array.isArray(data)) {
        setChatRooms(data);
        const formattedContacts = formatRoomsToContacts(data, user.id);
        setContacts(formattedContacts);
      }
    };

    const handleMarkedRead = () => {
      console.log("✅ Messages marked as read");
      loadChatRooms();
    };

    // Register event listeners
    socket.on("connect", loadChatRooms);
    socket.on("chat:receive", handleChatReceive);
    socket.on("chat:started", handleChatStarted);
    socket.on("chat:messages", handleChatMessages);
    socket.on("chat:rooms", handleChatRooms);
    socket.on("chat:marked-read", handleMarkedRead);
    socket.on("chat:error", handleChatError);

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up socket listeners...");
      socket.off("connect", loadChatRooms);
      socket.off("chat:receive", handleChatReceive);
      socket.off("chat:started", handleChatStarted);
      socket.off("chat:messages", handleChatMessages);
      socket.off("chat:rooms", handleChatRooms);
      socket.off("chat:marked-read", handleMarkedRead);
      socket.off("chat:error", handleChatError);

      // Jangan disconnect socket di sini, biarkan manage di level yang lebih tinggi
      // socket.disconnect()
    };
  }, [user, loadChatRooms, loadMessages]); // ✅ Dependencies minimal

  return {
    // State
    searchQuery,
    roomId,
    message,
    messages,
    contacts,
    activeRoom,
    showAddContactModal,
    replyingTo,
    isLoading,
    messagesEndRef,

    // Setters
    setSearchQuery,
    setMessage,
    setShowAddContactModal,
    setReplyingTo,

    // Actions
    loadMessages,
    sendMessage,
    selectContact,
    loadChatRooms,
  };
};
