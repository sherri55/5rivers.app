import { Router } from "express";
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} from "../controllers/unitsController";

const unitRoutes = Router();

unitRoutes.get("/", getUnits);
unitRoutes.get("/:id", getUnitById);
unitRoutes.post("/", createUnit);
unitRoutes.put("/:id", updateUnit);
unitRoutes.delete("/:id", deleteUnit);

export default unitRoutes;
