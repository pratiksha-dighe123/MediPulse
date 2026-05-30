import {Router} from "express";
import { loginController, registerController, logoutController } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
const authRouter = Router();

// POST /auth/register - Register a new user (patient or doctor)
authRouter.post("/register", registerController);

// POST /auth/login - Login a user and return a JWT token
authRouter.post("/login", loginController);

// POST /auth/logout - Logout a user (invalidate JWT token)
authRouter.post("/logout", verifyToken, logoutController);

export default authRouter;