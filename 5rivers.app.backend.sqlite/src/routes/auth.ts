import { Router } from "express";
import { login } from "../controllers/authController";

const authRouter = Router();

function asyncHandler(fn: any) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

authRouter.post("/login", asyncHandler(login));

export default authRouter;
