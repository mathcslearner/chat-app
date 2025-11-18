import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";
import type { MessageType } from "@/types/chat.type";
import { useEffect, useRef } from "react";
import {ChatMessageBody} from "./chat-body-message";


interface Props {
    chatId: string | null;
    messages: MessageType[];
    onReply: (message: MessageType) => void;
}

const ChatBody = ({chatId, messages, onReply}: Props) => {
    const {socket} = useSocket();
    const {addNewMessage} = useChat();
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!chatId) return;
        if (!socket) return;

        const handleNewMessage = (msg:MessageType) => addNewMessage(chatId, msg);

        socket.on("message:new", handleNewMessage);

        return () => {
            socket.off("message:new", handleNewMessage);
        }
    }, [socket, chatId, addNewMessage])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"})
    })

    return(
        <div className="flex-1 overflow-hidden">
            <div className="h-auto max-h-screen overflow-y-auto">
                <div className="w-full max-w-6xl mx-auto h-full flex flex-col px-3">
                    {messages?.map((message) => (
                        <ChatMessageBody key={message._id} message={message} onReply={onReply} />
                    ))}
                    <br />
                    <br />
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    )
}

export default ChatBody