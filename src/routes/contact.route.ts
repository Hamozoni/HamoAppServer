import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import contactsController from "../controllers/contacts.cotroller.js";

const router = Router();

router.post("/sync", authMiddleware, contactsController.getContacts);

export default router;