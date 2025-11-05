import {Server as HttpServer} from "http"
import {Server, type Socket} from "socket.io"
import { Env } from "../config/env.config"
import jwt from "jsonwebtoken"
import { validateChatParticipant } from "../services/chat.service"

interface AuthenticatedSocket extends Socket {
    userId?: string
}

let io: Server | null = null

const onlineUsers = new Map<string, string>()

export const initializeSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: Env.FRONTEND_ORIGIN,
            methods: ["GET", "POST"],
            credentials: true
        }
    })

    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const rawCookie = socket.handshake.headers.cookie
            
            if (!rawCookie) return next(new Error("Unauthorized"))

            const token = rawCookie?.split("=")?.[1]?.trim()

            if (!token) return next(new Error("Unauthorized"))

            const decodedToken = jwt.verify(token, Env.JWT_SECRET) as {
                userId: string
            }

            if (!decodedToken) return next(new Error("Unauthorized"))

            socket.userId = decodedToken.userId
            next()

        } catch (error) {
            next(new Error("Internal server error"))
        }
    })

    io.on("connection", (socket: AuthenticatedSocket) => {
        if (!socket.userId) {
            socket.disconnect(true)
            return
        }

        const userId = socket.userId
        const newSocketId = socket.id

        console.log("socket connected", {userId, newSocketId})

        onlineUsers.set(userId, newSocketId)

        io?.emit("online:users", Array.from(onlineUsers.keys()))

        socket.join(`user:${userId}`)

        socket.on("chat:join", async (chatId: string, callback?: (err?:string) => void) => {
            try {
                await validateChatParticipant(chatId, userId)
                socket.join(`chat:${chatId}`)
                callback?.()
            } catch (error) {
                callback?.("Error joining chat")
            }
        })

        socket.on("chat:leave", (chatId: string) => {
            if (chatId) {
                socket.leave(`chat: ${chatId}`)
                console.log(`User ${userId} left room chat:${chatId}`)
            }
        })

        socket.on("disconnect", () => {
            if (onlineUsers.get(userId) === newSocketId) {
                if (userId) onlineUsers.delete(userId)

                io?.emit("online:users", Array.from(onlineUsers.keys()))

                console.log("socket disconnected", {
                    userId, newSocketId
                })
            }
        })
    })
}

function getIO() {
    if (!io) throw new Error("Socket.IO not initialized")
    return io
}

export const emitNewChatToParticipants = (participantIds: string[] = [], chat: any) => {
    const io = getIO()

    for (const participantId of participantIds) {
        io.to(`user:${participantId}`).emit("chat:new", chat)
    }
}

export const emitNewMessageToChatRoom = (senderId: string, chatId: string, message: any) => {
    const io = getIO()
    const senderSocketId = onlineUsers.get(senderId)

    if (senderSocketId) {
        io.to(`chat:${chatId}`).except(senderSocketId).emit("message:new", message)
    } else {
        io.to(`chat:${chatId}`).emit("message:new", message)
    }
}

export const emitLastMessageToParticipants = (participantIds: string[], chatId: string, lastMessage: any) => {
    const io = getIO()
    const payload = {chatId, lastMessage}

    for (const participantId of participantIds) {
        io.to(`user:${participantId}`).emit("chat:update", payload)
    }
}

