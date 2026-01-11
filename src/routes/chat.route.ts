import { Router } from "express";
import { getAllChats, getChatDetails } from "../controllers/chat.controller.js";

const router = Router();

router.route('/')
    .get(getAllChats);

router.route('/:chatId')
    .get(getChatDetails);

export default router;
