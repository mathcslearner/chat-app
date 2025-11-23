import mongoose, {Document, Schema} from "mongoose"

export interface ChatDocument extends Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage: mongoose.Types.ObjectId;
    isGroup: Boolean;
    groupName: string;
    isAIChat: Boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const chatSchema = new Schema<ChatDocument>(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: "Message",
            default: null
        },
        isGroup: {
            type: Boolean,
            default: false
        },
        groupName: {type: String},
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        isAIChat: {type: Boolean, default: false}
    },
    {
        timestamps: true
    }
)

chatSchema.pre("save", async function (next) {
    if (this.isNew) {
        const User = mongoose.model("User")
        const participants = await User.find({
            _id: {$in: this.participants},
            isAI: true
        })
        if (participants.length > 0) {
            this.isAIChat = true
        }
    }
    next()
})

const ChatModel = mongoose.model<ChatDocument>("Chat", chatSchema)
export default ChatModel