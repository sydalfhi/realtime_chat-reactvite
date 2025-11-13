import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { socket } from "../utils/socket";
import { Message, ChatRoom, Contact, UnreadCountData } from "../types/chat";
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

  // ✅ NEW: Unread count states
  const [unreadCounts, setUnreadCounts] = useState<UnreadCountData>({
    total_unread: 0,
    unread_per_room: [],
  });
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔹 Load Unread Count
  const loadUnreadCount = useCallback(() => {
    if (user) {
      console.log("🔄 Loading unread counts...");
      socket.emit("chat:get-unread-count", { user_id: user.id });
    }
  }, [user]);

  // 🔹 Mark as Read Function
  const markAsRead = useCallback(
    (roomId: string) => {
      if (user && roomId) {
        console.log("📖 Marking messages as read for room:", roomId);
        setIsMarkingRead(true);

        socket.emit("chat:mark-read", {
          room_id: roomId,
          user_id: user.id,
        });

        // Reset loading state setelah delay
        setTimeout(() => setIsMarkingRead(false), 1000);
      }
    },
    [user]
  );

  const loadChatRooms = useCallback(() => {
    if (user) {
      console.log("🔄 Loading chat rooms...");
      socket.emit("chat:get-rooms", { user_id: user.id });

      // Juga load unread count
      loadUnreadCount();
    }
  }, [user, loadUnreadCount]);

  const loadMessages = useCallback(
    (roomId: string) => {
      if (user) {
        console.log("🔄 Loading messages for room:", roomId);
        setIsLoading(true);

        socket.emit("chat:get-messages", {
          room_id: roomId,
          user_id: user.id,
        });

        // Auto mark as read saat load messages
        markAsRead(roomId);

        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    },
    [user, markAsRead]
  );

  const sendMessage = useCallback(() => {
    if (user && roomId && message.trim()) {
      console.log("📤 Sending message:", { roomId, message });
      const messageData = {
        user_id: user.id,
        room_id: roomId,
        message: message.trim(),
        parent_id: replyingTo?.parent_id,
      };
      console.log("🚀 ~ useChat ~ messageData:", messageData);

      socket.emit("chat:send", messageData);
      setMessage("");
      setReplyingTo(null);
    }
  }, [user, roomId, message, replyingTo]);

  const selectContact = useCallback(
    (contact: Contact) => {
      console.log("👤 Selecting contact:", contact);
      setRoomId(contact.room_id);
      setActiveRoom(contact.room_id);

      // Join room dengan user_id untuk auto mark as read
      socket.emit("chat:join", {
        room_id: contact.room_id,
        user_id: user?.id,
      });

      loadMessages(contact.room_id);
      setSearchQuery("");
      setReplyingTo(null);
    },
    [loadMessages, user]
  );

  // 🔹 FIX: Update messages status ketika marked-read event diterima
  const updateMessagesStatus = useCallback(
    (roomId: string, markedByUserId: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.room_id == roomId &&
          msg.user_id !== markedByUserId &&
          msg.status == 0
            ? { ...msg, status: 1 }
            : msg
        )
      );

      // Update unread counts
      setUnreadCounts((prev) => ({
        ...prev,
        total_unread: Math.max(0, prev.total_unread - 1),
        unread_per_room: prev.unread_per_room.map((room) =>
          room.room_id == roomId
            ? { ...room, unread_count: Math.max(0, room.unread_count - 1) }
            : room
        ),
      }));
    },
    []
  );

  // 🔹 FIX: Enhanced socket event handlers
  useEffect(() => {
    if (!user) return;

    console.log("🔌 Connecting socket...");
    socket.connect();

    // Di hooks/useChat.ts - PERBAIKI handleChatReceive
    const handleChatReceive = (data: Message) => {
      console.log("📨 Received message:", data);

      setMessages((prev) => {
        // ✅ FIX: Improved duplicate detection
        const isDuplicate = prev.some((msg) => {
          // Jika ada ID yang sama
          if (msg.id && data.id && msg.id === data.id) {
            return true;
          }

          // Jika temporary message dengan created_at yang sama (dalam 2 detik)
          if (
            msg.temporary &&
            data.temporary &&
            msg.created_at === data.created_at &&
            msg.user_id === data.user_id
          ) {
            const timeDiff = Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(data.created_at).getTime()
            );
            return timeDiff < 2000; // 2 detik tolerance
          }

          // Jika message content dan user sama dalam waktu dekat
          if (
            msg.message === data.message &&
            msg.user_id === data.user_id &&
            msg.room_id === data.room_id
          ) {
            const timeDiff = Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(data.created_at).getTime()
            );
            return timeDiff < 5000; // 5 detik tolerance
          }

          return false;
        });

        if (isDuplicate) {
          console.log("🔄 Skipping duplicate message:", data);
          return prev;
        }

        console.log("➕ Adding new message to state");

        // Handle parent message
        if (data.parent_id) {
          const parentMessage = prev.find((msg) => msg.id === data.parent_id);
          if (parentMessage) {
            const enhancedData = {
              ...data,
              parent_message: parentMessage.message,
              parent_user_id: parentMessage.user_id,
            };
            return [...prev, enhancedData];
          }
        }

        return [...prev, data];
      });

      // Auto scroll
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    const handleChatStarted = (data: any) => {
      console.log("🚀 Chat started:", data);
      if (data.room_id) {
        setRoomId(data.room_id);
        setActiveRoom(data.room_id);
        socket.emit("chat:join", {
          room_id: data.room_id,
          user_id: user.id,
        });
        loadMessages(data.room_id);
        loadChatRooms();
        setShowAddContactModal(false);
      }
    };

    const handleChatMessages = (data: any) => {
      console.log("📜 Received messages:", data);
      if (data.messages) {
        setMessages(data.messages);

        // Mark as read setelah menerima messages
        if (data.messages.length > 0) {
          markAsRead(data.messages[0].room_id);
        }

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

    // ✅ NEW: Handle marked-read event
    const handleMarkedRead = (data: any) => {
      console.log("✅ Messages marked as read:", data);
      if (data.room_id && data.user_id) {
        updateMessagesStatus(data.room_id, data.user_id);
      }
      loadUnreadCount(); // Refresh unread counts
    };

    // ✅ NEW: Handle unread count event
    const handleUnreadCount = (data: UnreadCountData) => {
      console.log("📊 Unread counts:", data);
      setUnreadCounts(data);
    };

    // ✅ NEW: Handle mark read success
    const handleMarkReadSuccess = (data: any) => {
      console.log("🎯 Mark read success:", data);
      setIsMarkingRead(false);
    };

    // ✅ NEW: Handle ketika message berhasil disimpan ke database
    const handleMessageSaved = (savedMessage: any) => {
      console.log("💾 Message saved to database:", savedMessage);

      setMessages((prev) =>
        prev.map((msg) => {
          // ✅ FIX: Replace temporary message dengan saved message
          if (msg.temporary && msg.id === savedMessage.temporaryId) {
            console.log(
              `🔄 Replacing temporary message ${msg.id} with saved message ${savedMessage.id}`
            );
            return {
              ...savedMessage,
              isSending: false,
              temporary: false,
            };
          }

          // ✅ FIX: Jika message dengan ID yang sama sudah ada, update saja
          if (msg.id === savedMessage.id) {
            console.log(`🔄 Updating existing message ${msg.id}`);
            return {
              ...msg,
              ...savedMessage,
              isSending: false,
            };
          }

          return msg;
        })
      );
    };

    // Register di useEffect
    socket.on("chat:message-saved", handleMessageSaved);

    const handleMessageFailed = (data: any) => {
      console.error("❌ Message failed to save:", data);

      setMessages((prev) =>
        prev.filter((msg) => !(msg.temporary && msg.id === data.temporaryId))
      );

      // Tampilkan error ke user
      handleChatError({
        message: `Gagal mengirim pesan: ${
          data.error?.message || "Unknown error"
        }`,
        type: "message-send-error",
      });
    };

    // Register event listeners
    socket.on("connect", loadChatRooms);
    socket.on("chat:receive", handleChatReceive);
    socket.on("chat:started", handleChatStarted);
    socket.on("chat:messages", handleChatMessages);
    socket.on("chat:rooms", handleChatRooms);
    socket.on("chat:marked-read", handleMarkedRead);
    socket.on("chat:unread-count", handleUnreadCount);
    socket.on("chat:mark-read-success", handleMarkReadSuccess);
    socket.on("chat:error", handleChatError);
    socket.on("chat:message-saved", handleMessageSaved);
    socket.on("chat:message-failed", handleMessageFailed);

    // Load initial data
    loadChatRooms();
    loadUnreadCount();

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up socket listeners...");
      socket.off("connect", loadChatRooms);
      socket.off("chat:receive", handleChatReceive);
      socket.off("chat:started", handleChatStarted);
      socket.off("chat:messages", handleChatMessages);
      socket.off("chat:rooms", handleChatRooms);
      socket.off("chat:marked-read", handleMarkedRead);
      socket.off("chat:unread-count", handleUnreadCount);
      socket.off("chat:mark-read-success", handleMarkReadSuccess);
      socket.off("chat:error", handleChatError);
    };
  }, [
    user,
    loadChatRooms,
    loadMessages,
    loadUnreadCount,
    markAsRead,
    updateMessagesStatus,
    activeRoom,
  ]);

  // 🔹 Get unread count for specific room
  const getUnreadCountForRoom = useCallback(
    (roomId: string) => {
      const roomData = unreadCounts.unread_per_room.find(
        (room) => room.room_id == roomId
      );
      return roomData ? roomData.unread_count : 0;
    },
    [unreadCounts]
  );

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
    unreadCounts, // ✅ NEW
    isMarkingRead, // ✅ NEW
    getUnreadCountForRoom, // ✅ NEW

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
    markAsRead, // ✅ NEW
    loadUnreadCount, // ✅ NEW
  };
};
