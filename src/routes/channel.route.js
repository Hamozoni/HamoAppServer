import { Router } from "express";
import { getAllChannels,getChannelDetails } from "../controllers/channel.controller.js";
// import uploadMiddleware from "../middleware/upload.middleware.js";

const router = Router();

router.route('/')
.get(getAllChannels)

router.route('/:channelId')
.get(getChannelDetails)

export default router;