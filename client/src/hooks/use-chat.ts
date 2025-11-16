import {create} from "zustand"
import type { ChatType, CreateChatType, MessageType } from "@/types/chat.type"
import type { UserType } from "@/types/auth.type"
import { API } from "@/lib/axios-client";
import { toast } from "sonner";

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

    fetchAllUsers: () => void;
    fetchChats: () => void;
    createChat: (payload: CreateChatType) => Promise<ChatType | null>;
    fetchSingleChat: (chatId: string) => void;

    addNewChat: (newChat: ChatType) => void;
    updateChatLastMessage: (chatId: string, lastMessage: MessageType) => void;
}

export const useChat = create<ChatState>()((set, get) => ({
    chats: [],
    users: [],
    singleChat: null,

    areChatsLoading: false,
    areUsersLoading: false,
    isCreatingChat: false,
    isSingleChatLoading: false,

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

    fetchSingleChat: async () => {
        set({isSingleChatLoading: true})
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
    }
}))