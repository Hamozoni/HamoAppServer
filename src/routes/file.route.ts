
import { Router } from "express"
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/upload", authMiddleware);

export default router;