// src/hooks/useChat.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { socket } from "../utils/socket";
import type {
  Message,
  ChatRoom,
  Contact,
  UnreadCountData,
} from "../types/chat";
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
  const [unreadCounts, setUnreadCounts] = useState<UnreadCountData>({
    total_unread: 0,
    unread_per_room: [],
  });
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Unread Count
  const loadUnreadCount = useCallback(() => {
    if (user) {
      // console.log("Loading unread counts...");
      socket.emit("chat:get-unread-count", { user_id: user.id });
    }
  }, [user]);

  // Mark as Read Function
  const markAsRead = useCallback(
    (roomId: string) => {
      if (user && roomId) {
        // console.log("Marking messages as read for room:", roomId);
        setIsMarkingRead(true);

        socket.emit("chat:mark-read", {
          room_id: roomId,
          user_id: user.id,
        });

        setTimeout(() => setIsMarkingRead(false), 1000);
      }
    },
    [user]
  );

  // Load Chat Rooms
  const loadChatRooms = useCallback(() => {
    if (user) {
      // console.log("Loading chat rooms...");
      socket.emit("chat:get-rooms", { user_id: user.id });
      loadUnreadCount();
    }
  }, [user, loadUnreadCount]);

  // Load Messages
  const loadMessages = useCallback(
    (roomId: string) => {
      if (user) {
        // console.log("Loading messages for room:", roomId);
        setIsLoading(true);

        socket.emit("chat:get-messages", {
          room_id: roomId,
          user_id: user.id,
        });

        markAsRead(roomId);

        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    },
    [user, markAsRead]
  );

  // Send Message
  const sendMessage = useCallback(
    (
      text?: string,
      fileData?: { file: string; file_name: string; file_type: string }
    ) => {
      if (user && roomId && (text?.trim() || fileData)) {
        // console.log("Sending message with file:", {
        //   roomId,
        //   text,
        //   hasFile: !!fileData,
        //   fileType: fileData?.file_type,
        // });

        let messageType = "text";
        if (fileData) {
          if (fileData.file_type.startsWith("image/")) {
            messageType = "image";
          } else if (fileData.file_type.startsWith("audio/")) {
            messageType = "audio";
          } else if (fileData.file_type.startsWith("video/")) {
            messageType = "video";
          } else {
            messageType = "document";
          }
        }

        const messageData = {
          user_id: user.id,
          room_id: roomId,
          message: text?.trim() || (fileData ? "Mengirim file..." : ""),
          parent_id: replyingTo?.parent_id || replyingTo?.id || null,
          parent_message: replyingTo?.message || null,
          parent_user_id: replyingTo?.user_id || null,
          ...(fileData && {
            file: fileData.file,
            file_name: fileData.file_name,
            file_type: fileData.file_type,
            message_type: messageType,
          }),
        };

        // console.log("Sending message data:", {
        //   ...messageData,
        //   file: fileData ? `base64(${fileData.file.length} chars)` : "none",
        //   message_type: messageType,
        // });

        socket.emit("chat:send", messageData);
        setMessage("");
        setReplyingTo(null);
      }
    },
    [user, roomId, replyingTo]
  );

  // Select Contact
  const selectContact = useCallback(
    (contact: Contact | null) => {
      // console.log("Selecting contact:", contact);

      if (activeRoom && activeRoom !== contact?.room_id) {
        leaveRoom(activeRoom);
      }

      if (!contact) {
        closeChat();
        return;
      }

      setRoomId(contact.room_id);
      setActiveRoom(contact.room_id);

      socket.emit("chat:join", {
        room_id: contact.room_id,
        user_id: user?.id,
      });

      loadMessages(contact.room_id);
      setSearchQuery("");
      setReplyingTo(null);
    },
    [loadMessages, user, activeRoom]
  );

  // Close Chat
  const closeChat = useCallback(() => {
    if (!user) return;

    // console.log("Closing chat and leaving all rooms...");

    socket.emit("chat:leave", {
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });

    setRoomId("");
    setActiveRoom("");
    setMessages([]);
    setMessage("");
    setReplyingTo(null);
    setSearchQuery("");

    return true;
  }, [user]);

  // Leave Room tertentu
  const leaveRoom = useCallback(
    (roomId: string) => {
      if (!user || !roomId) return;

      // console.log(`Leaving room: ${roomId}`);

      socket.emit("chat:leave", {
        room_id: roomId,
        user_id: user.id,
      });

      socket.off(`chat:receive:${roomId}`);

      return roomId;
    },
    [user]
  );

  // Start New Chat
  const startNewChat = useCallback(
    (targetUserId: number) => {
      if (!user) return;

      // console.log("Starting new chat with user:", targetUserId);

      socket.emit("chat:start", {
        user_id: user.id,
        target_user_id: targetUserId,
      });
    },
    [user]
  );

  // Update messages status ketika marked-read event diterima
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

  // Get unread count for specific room
  const getUnreadCountForRoom = useCallback(
    (roomId: string) => {
      const roomData = unreadCounts.unread_per_room.find(
        (room) => room.room_id == roomId
      );
      return roomData ? roomData.unread_count : 0;
    },
    [unreadCounts]
  );

  // Cancel Reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Scroll to Bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Main Socket Effect
  useEffect(() => {
    if (!user) return;

    // console.log("Connecting socket...");
    socket.connect();

    const handleChatReceive = (data: Message & { temporaryId?: string }) => {
      /* console.log("Received message:", {
        id: data.id,
        temporaryId: data.temporaryId,
        room_id: data.room_id,
        from_user: data.user_id,
        to_user: user.id,
        is_temporary: data.temporary,
        message_type: data.message_type,
      }); */

      setMessages((prev) => {
        if (data.temporaryId && !data.temporary) {
          /* console.log(
            `Replacing temporary message ${data.temporaryId} with saved message ${data.id}`
          ); */
          return prev.map((msg) =>
            msg.temporary && msg.id === data.temporaryId
              ? {
                  ...data,
                  isSending: false,
                  temporary: false,
                  file_url: data.file_url || null,
                }
              : msg
          );
        }

        const isDuplicate = prev.some((msg) => {
          if (msg.id && data.id && msg.id === data.id) return true;
          if (msg.temporary && data.temporary && msg.id === data.id)
            return true;
          if (
            msg.message === data.message &&
            msg.user_id === data.user_id &&
            msg.room_id === data.room_id
          ) {
            const timeDiff = Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(data.created_at).getTime()
            );
            return timeDiff < 5000;
          }
          return false;
        });

        if (isDuplicate) {
          // console.log("Skipping duplicate message");
          return prev;
        }

        // console.log("Adding new message to state");

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

      scrollToBottom();
    };

    const handleChatStarted = (data: any) => {
      // console.log("Chat started:", data);
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
      // console.log("Received messages:", data);
      if (data.messages) {
        setMessages(data.messages);

        if (data.messages.length > 0) {
          markAsRead(data.messages[0].room_id);
        }

        scrollToBottom();
      }
    };

    const handleChatRooms = (data: any) => {
      // console.log("Received rooms:", data);
      if (Array.isArray(data)) {
        setChatRooms(data);
        const formattedContacts = formatRoomsToContacts(data, user.id);
        setContacts(formattedContacts);
      }
    };

    const handleMarkedRead = (data: any) => {
      // console.log("Messages marked as read:", data);
      if (data.room_id && data.user_id) {
        updateMessagesStatus(data.room_id, data.user_id);
      }
      loadUnreadCount();
    };

    const handleUnreadCount = (data: UnreadCountData) => {
      // console.log("Unread counts:", data);
      setUnreadCounts(data);
    };

    const handleMarkReadSuccess = (data: any) => {
      // console.log("Mark read success:", data);
      setIsMarkingRead(false);
    };

    const handleMessageSaved = (savedMessage: any) => {
      // console.log("Message saved to database:", savedMessage);

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.temporary && msg.id == savedMessage.temporaryId) {
            // console.log(`Replacing temporary message ${msg.id} with saved message ${savedMessage.id}`);
            return {
              ...savedMessage,
              isSending: false,
              temporary: false,
            };
          }

          if (msg.id == savedMessage.id) {
            // console.log(`Updating existing message ${msg.id}`);
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

    const handleMessageFailed = (data: any) => {
      console.error("Message failed to save:", data);

      setMessages((prev) =>
        prev.filter((msg) => !(msg.temporary && msg.id == data.temporaryId))
      );

      handleChatError({
        message: `Gagal mengirim pesan: ${
          data.error?.message || "Unknown error"
        }`,
        type: "message-send-error",
      });
    };

    const handleLeaveConfirmation = (data: any) => {
      // console.log("Successfully left room:", data);
    };

    const handleUserLeft = (data: any) => {
      // console.log("User left room:", data);
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
    socket.on("chat:leave-confirmation", handleLeaveConfirmation);
    socket.on("chat:user-left", handleUserLeft);

    loadChatRooms();
    loadUnreadCount();

    return () => {
      // console.log("Cleaning up socket listeners...");
      socket.off("connect", loadChatRooms);
      socket.off("chat:receive", handleChatReceive);
      socket.off("chat:started", handleChatStarted);
      socket.off("chat:messages", handleChatMessages);
      socket.off("chat:rooms", handleChatRooms);
      socket.off("chat:marked-read", handleMarkedRead);
      socket.off("chat:unread-count", handleUnreadCount);
      socket.off("chat:mark-read-success", handleMarkReadSuccess);
      socket.off("chat:error", handleChatError);
      socket.off("chat:message-saved", handleMessageSaved);
      socket.off("chat:message-failed", handleMessageFailed);
      socket.off("chat:leave-confirmation", handleLeaveConfirmation);
      socket.off("chat:user-left", handleUserLeft);
    };
  }, [
    user,
    loadChatRooms,
    loadMessages,
    loadUnreadCount,
    markAsRead,
    updateMessagesStatus,
    activeRoom,
    scrollToBottom,
  ]);

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
    unreadCounts,
    isMarkingRead,

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
    markAsRead,
    loadUnreadCount,
    closeChat,
    leaveRoom,
    startNewChat,
    cancelReply,
    scrollToBottom,
    getUnreadCountForRoom,
  };
};
