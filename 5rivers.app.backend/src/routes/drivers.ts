// routes/drivers.ts
import { Router } from "express";
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} from "../controllers/driversController";
const driverRoutes = Router();
driverRoutes.get("/", getDrivers);
driverRoutes.get("/:id", getDriverById);
driverRoutes.post("/", createDriver);
driverRoutes.put("/:id", updateDriver);
driverRoutes.delete("/:id", deleteDriver);
export default driverRoutes;
