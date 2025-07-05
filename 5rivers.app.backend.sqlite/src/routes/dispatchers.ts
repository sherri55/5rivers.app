import { Router } from "express";
import {
  getDispatchers,
  getDispatcherById,
  createDispatcher,
  updateDispatcher,
  deleteDispatcher,
} from "../controllers/dispatchersController";

const dispatcherRoutes = Router();

dispatcherRoutes.get("/", getDispatchers);
dispatcherRoutes.get("/:id", getDispatcherById);
dispatcherRoutes.post("/", createDispatcher);
dispatcherRoutes.put("/:id", updateDispatcher);
dispatcherRoutes.delete("/:id", deleteDispatcher);

export default dispatcherRoutes;
