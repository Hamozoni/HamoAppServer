
import { Router } from "express"
import { authMiddleware } from "../middleware/auth.middleware.js";
import fileController from "../controllers/file.controller.js";

const router = Router();

router.post("/upload", authMiddleware,);

router.post("/signature", authMiddleware, fileController.signature);

router.post("/confirm", authMiddleware, fileController.confirm);

router.post("/:fileId/downloaded", authMiddleware, fileController.downloaded);

export default router;