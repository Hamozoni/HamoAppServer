import { Router } from "express";
import { getAllChannels, getChannelDetails } from "../controllers/channel.controller.js";

const router = Router();

router.route('/')
    .get(getAllChannels);

router.route('/:channelId')
    .get(getChannelDetails);

export default router;
