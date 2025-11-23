import {create} from "zustand"
import type { ChatType, CreateChatType, CreateMessageType, MessageType } from "@/types/chat.type"
import type { UserType } from "@/types/auth.type"
import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import { generateUUID } from "@/lib/helper";

interface ChatState {
    chats: ChatType[];
    users: UserType[];
    singleChat: {
        chat: ChatType;
        messages: MessageType[];
    } | null;

    areChatsLoading: boolean;
    areUsersLoading: boolean;
    isCreatingChat: boolean;
    isSingleChatLoading: boolean;
    isSendingMsg: boolean;

    fetchAllUsers: () => void;
    fetchChats: () => void;
    createChat: (payload: CreateChatType) => Promise<ChatType | null>;
    fetchSingleChat: (chatId: string) => void;
    sendMessage: (payload: CreateMessageType, isAIChat?: boolean) => void;

    addNewChat: (newChat: ChatType) => void;
    updateChatLastMessage: (chatId: string, lastMessage: MessageType) => void;
    addNewMessage: (chatId: string, message: MessageType) => void;

    addOrUpdateMessage: (chatId: string, msg: MessageType, tempId?: string) => void;
}

export const useChat = create<ChatState>()((set, get) => ({
    chats: [],
    users: [],
    singleChat: null,

    areChatsLoading: false,
    areUsersLoading: false,
    isCreatingChat: false,
    isSingleChatLoading: false,
    isSendingMsg: false,

    fetchAllUsers: async () => {
        set({areUsersLoading: true})
        try {
            const {data} = await API.get("/user/all")
            set({users: data.users})
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to fetch users")
        } finally {
            set({areUsersLoading: false})
        }
    },

    fetchChats: async () => {
        set({areChatsLoading: true})
        try {
            const {data} = await API.get("/chat/all")
            set({chats: data.chats})
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to fetch chats")
        } finally {
            set({areChatsLoading: false})
        }
    },

    createChat: async (payload: CreateChatType) => {
        set({isCreatingChat: true})
        try {
            const response = await API.post("/chat/create", {...payload})
            get().addNewChat(response.data.chat)
            toast.success("Chat created successfully")
            return response.data.chat
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to create chat")
            return null
        } finally {
            set({isCreatingChat: false})
        }
    },

    fetchSingleChat: async (chatId: string) => {
        set({isSingleChatLoading: true})
        try {
            const {data} = await API.get(`/chat/${chatId}`);
            set({singleChat: data});
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to fetch chats");
        } finally {
            set({isSingleChatLoading: false});
        }
    },

    sendMessage: async (payload: CreateMessageType, isAIChat?: boolean) => {
        set({isSendingMsg: true})
        const {chatId, replyTo, content, image} = payload;
        const {user} = useAuth.getState();
        const chat = get().singleChat?.chat
        const aiSender = chat?.participants.find((p) => p.isAI)

        if (!chatId || !user?._id) return;

        const tempMsgId = generateUUID();
        const tempAIId = generateUUID();
        const tempMessage = {
            _id: tempMsgId,
            chatId,
            content: content || "",
            image: image || null,
            sender: user,
            replyTo: replyTo || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: !isAIChat ? "Sending..." : ""
        }

        get().addOrUpdateMessage(chatId, tempMessage, tempMsgId)

        if (isAIChat && aiSender) {
            const tempAIMessage = {
                _id: tempAIId, chatId, content: "", sender: aiSender, image: null, replyTo: null, streaming: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            }
            get().addOrUpdateMessage(chatId, tempAIMessage, tempAIId)
        }

        try {
            const {data} = await API.post("/chat/message/send", {chatId, content, image, replyToId: replyTo?._id});
            const {userMessage, aiResponse} = data;

            get().addOrUpdateMessage(chatId, userMessage, tempMsgId);

            if (isAIChat && aiSender) {
                get().addOrUpdateMessage(chatId, aiResponse, tempAIId)
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to send message")
        } finally {
            set({isSendingMsg: false})
        }
    },

    addNewChat: (newChat: ChatType) => {
        set((state) => {
            const existingChatIndex = state.chats.findIndex((c) => c._id === newChat._id)
            if (existingChatIndex !== -1) {
                //if chat exists, move it to the top
                return {
                    chats: [newChat, ...state.chats.filter((c) => c._id !== newChat._id)]
                }
            } else {
                return {
                    chats: [newChat, ...state.chats]
                }
            }
        })
    },

    updateChatLastMessage: (chatId, lastMessage) => {
        set((state) => {
            const chat = state.chats.find((c) => c._id === chatId);
            if (!chat) return state
            return {
                chats: [{...chat, lastMessage}, ...state.chats.filter((c) => c._id !== chatId)]
            }
        })
    },

    addNewMessage: (chatId, message) => {
        const _chat = get().singleChat;
        if (_chat?.chat._id === chatId) {
            set({
                singleChat: {
                    chat: _chat.chat,
                    messages: [..._chat.messages, message]
                }
            })
        }
    },

    addOrUpdateMessage: (chatId: string, msg: MessageType, tempId?: string) => {
        const singleChat = get().singleChat;
        if (!singleChat || singleChat.chat._id !== chatId) return;

        const messages = singleChat.messages;
        const msgIndex = tempId ? messages.findIndex((msg) => msg._id === tempId) : -1;

        let updatedMessages;

        if (msgIndex !== -1) {
            updatedMessages = messages.map((msg, index) => index === msgIndex ? {...msg} : msg)
        } else {
            updatedMessages = [...messages, msg]
        }

        set({
            singleChat: {chat: singleChat.chat, messages: updatedMessages}
        })
    }
}))