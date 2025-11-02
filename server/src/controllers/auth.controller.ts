import express, {Request, Response} from "express"
import { asyncHandler } from "../middlewares/asyncHandler.middleware"
import {registerSchema, loginSchema} from "../validators/auth.validator"
import {registerService, loginService} from "../services/auth.service"
import {clearJwtAuthCookie, setJwtAuthCookie} from "../utils/cookie"
import {HTTPSTATUS} from "../config/http.config"

export const registerController = asyncHandler(
    async (req: Request, res: Response) => {
        const body = registerSchema.parse(req.body)

        const user = await registerService(body)
        const userId = user._id as string

        return setJwtAuthCookie({
            res,
            userId
        }).status(HTTPSTATUS.CREATED).json({
            message: "User created & login successful",
            user
        })
    }
)

export const loginController = asyncHandler(
    async (req: Request, res: Response) => {
        const body = loginSchema.parse(req.body)

        const user = await loginService(body)
        const userId = user._id as string
        
        return setJwtAuthCookie({
            res,
            userId
        }).status(HTTPSTATUS.CREATED).json({
            message: "User login successful",
            user
        })
    }
)

export const logoutController = asyncHandler(
    async (req: Request, res: Response) => {
        return clearJwtAuthCookie(res).status(HTTPSTATUS.OK).json({
            message: "User logout successful"
        })
    }
)

export const authStatusController = asyncHandler(
    async (req: Request, res: Response) => {
        const user = req.user
        return res.status(HTTPSTATUS.OK).json({
            message: "Authenticated user",
            user
        })
    }
)


