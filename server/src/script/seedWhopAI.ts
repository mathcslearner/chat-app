import "dotenv/config"
import UserModel from "../models/user.model"
import connectDatabase from "../config/database.config"

export const CreateWhopAI = async () => {
    const existingAI = await UserModel.findOne({isAI: true})
    if (existingAI) {
        await UserModel.deleteOne({_id: existingAI._id})
    }

    const whopAI = await UserModel.create({
        name: "Whop AI",
        isAI: true,
        avatar: "placeholder"
    })

    console.log("Whop AI created: ", whopAI._id)
    return whopAI
}

const seedWhopAI = async () => {
    try {
        await connectDatabase()
        await CreateWhopAI()
        console.log("Seeding completed")
        process.exit(0)
    } catch (error) {
        console.error("Seeding failed: ", error)
        process.exit(1)
    }
}