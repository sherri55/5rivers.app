import { Router } from "express";
import {
  getJobTypes,
  getJobTypeById,
  createJobType,
  updateJobType,
  deleteJobType,
} from "../controllers/jobTypesController";

const jobTypeRoutes = Router();

jobTypeRoutes.get("/", getJobTypes);
jobTypeRoutes.get("/:id", getJobTypeById);
jobTypeRoutes.post("/", createJobType);
jobTypeRoutes.put("/:id", updateJobType);
jobTypeRoutes.delete("/:id", deleteJobType);

export default jobTypeRoutes;
