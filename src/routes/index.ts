import { Router } from 'express';
import authRoute from "./auth.route.js";
import callRoute from "./call.route.js";
import chatRoute from "./chat.route.js";
import channelRoute from "./channel.route.js";
import contactRoute from "./contact.route.js";
import statusRoute from "./status.route.js";
import messageRoute from "./message.route.js";

const router = Router();

router.use('/auth', authRoute);
router.use('/calls', callRoute);
router.use('/chats', chatRoute);
router.use('/channels', channelRoute);
router.use('/contacts', contactRoute);
router.use('/status', statusRoute);
router.use('/messages', messageRoute);

export default router;
