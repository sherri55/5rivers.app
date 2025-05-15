// routes/jobs.ts
import { Router } from "express";
import multer from "multer";
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  togglePaymentReceived,
} from "../controllers/jobsController";

const upload = multer(); // memory storage, no files saved unless handled in controller

const jobRoutes = Router();
jobRoutes.get("/", getJobs);
jobRoutes.get("/:id", getJobById);
jobRoutes.post("/", upload.any(), createJob); // allow files and fields
jobRoutes.put("/:id", upload.any(), updateJob); // allow files and fields
jobRoutes.delete("/:id", deleteJob);
jobRoutes.put("/:id/toggle-payment", togglePaymentReceived);

export default jobRoutes;
