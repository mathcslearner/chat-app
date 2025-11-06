import { API } from "@/lib/axios-client";
import type { LoginType, RegisterType, UserType } from "@/types/auth.type";
import type { Register } from "react-router-dom";
import { toast } from "sonner";
import { create } from "zustand";
import {persist} from "zustand/middleware"
import { useSocket } from "./use-socket";

interface AuthState {
    user: UserType | null
    isLoggingIn: boolean
    isSigningUp: boolean
    isAuthStatusLoading: boolean

    register: (data: RegisterType) => void
    login: (data: LoginType) => void
    logout: () => void
    isAuthStatus: () => void
}

export const useAuth = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isSigningUp: false,
            isLoggingIn: false,
            isAuthStatusLoading: false,

            register: async (data: RegisterType) => {
                set({isSigningUp: true})
                try {
                    const response = await API.post("/auth/register", data)
                    set({user: response.data.user})
                    useSocket.getState().connectSocket()
                } catch (error: any) {
                    toast.error(error.response?.data?.message || "Register failed")
                } finally {
                    set({isSigningUp: false})
                }
            },
            login: async (data: LoginType) => {
                set({isLoggingIn: true})
                try {
                    const response = await API.post("/auth/login", data)
                    set({user: response.data.user})
                    useSocket.getState().connectSocket()
                } catch (error: any) {
                    toast.error(error.response?.data?.message || "Register failed")
                } finally {
                    set({isLoggingIn: false})
                }
            },
            logout: async () => {
                try {
                    await API.post("/auth/logout")
                    set({user: null})
                    useSocket.getState().disconnectSocket()
                } catch (error: any) {
                    toast.error(error.response?.data?.message || "Register failed")
                }
            },
            isAuthStatus: async () => {
                set({isAuthStatusLoading: true})
                try {
                    const response = await API.get("/auth/status")
                    set({user: response.data.user})
                    useSocket.getState().connectSocket()
                } catch (error: any) {
                    toast.error(error.response?.data?.message || "Authentication failed")
                    console.log(error)
                } finally {
                    set({isAuthStatusLoading: false})
                }
            }
        }),
        {
            name: "whop:root"
        }
    )
)