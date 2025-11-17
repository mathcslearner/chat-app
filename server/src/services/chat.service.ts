import ChatModel from "../models/chat.model"
import UserModel from "../models/user.model"
import MessageModel from "../models/message.model"
import { BadRequestException, NotFoundException } from "../utils/app-error"
import { emitNewChatToParticipants } from "../lib/socket"

export const createChatService = async (
    userId: string,
    body: {
        participantId?: string,
        isGroup?: boolean,
        participants?: string[],
        groupName?: string
    }
) => {
    const {
        participantId,
        isGroup,
        participants,
        groupName
    } = body

    let chat
    let allParticipantsIds: string[] = []

    if (isGroup && participants?.length && groupName) {
        allParticipantsIds = [userId, ...participants]
        chat = await ChatModel.create({
            participants: allParticipantsIds,
            isGroup: true,
            groupName,
            createdBy: userId
        })
    } 

    else if (participantId) {
        const otherUser = await UserModel.findById(participantId)
        if (!otherUser) throw new NotFoundException("User not found")

        allParticipantsIds = [userId, participantId]

        const existingChat = await ChatModel.findOne({
            participants: {$all: allParticipantsIds, $size: 2}
        }).populate("participants", "name avatar")

        if (existingChat) return existingChat

        chat = await ChatModel.create({
            participants: allParticipantsIds,
            isGroup: false,
            createdBy: userId
        })
    }

    const populatedChat = await chat?.populate("participants", "name avatar")
    const participantIdStrings = populatedChat?.participants?.map((p) => {return p._id?.toString()})

    emitNewChatToParticipants(participantIdStrings, populatedChat)

    return chat
}

export const getUserChatsService = async (userId: string) => {
    const chats = await ChatModel.find({participants: {$in: [userId]}}).populate("participants", "name avatar")
        .populate({path: "lastMessage", populate: {
            path: "sender",
            select: "name avatar"
        }})
        .sort({updatedAt: -1})

    return chats
}

export const getSingleChatService = async (chatId: string, userId: string) => {
    const chat = await ChatModel.findOne({
        _id: chatId,
        participants: {
            $in: [userId]
        }
    }).populate("participants", "name avatar")

    if (!chat) throw new BadRequestException("Chat not found or you are not authorized to view this chat")

    const messages = await MessageModel.find({chatId}).populate("sender", "name avatar")
        .populate({
            path: "replyTo",
            select: "content image sender",
            populate: {
                path: "sender",
                select: "name avatar"
            }
        }).sort({createdAt: -1})

    return {chat, messages}
}   

export const validateChatParticipant = async (chatId: string, userId: string) => {
    const chat = await ChatModel.findOne({
        _id: chatId,
        participants: {
            $in: [userId]
        }
    })

    if (!chat) throw new BadRequestException("User not a participant in chat")

    return chat
}