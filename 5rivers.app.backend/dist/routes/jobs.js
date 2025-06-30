"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/jobs.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const jobsController_1 = require("../controllers/jobsController");
const upload = (0, multer_1.default)(); // memory storage, no files saved unless handled in controller
const jobRoutes = (0, express_1.Router)();
jobRoutes.get("/", jobsController_1.getJobs);
jobRoutes.get("/:id", jobsController_1.getJobById);
jobRoutes.post("/", upload.any(), jobsController_1.createJob); // allow files and fields
jobRoutes.put("/:id", upload.any(), jobsController_1.updateJob); // allow files and fields
jobRoutes.delete("/:id", jobsController_1.deleteJob);
jobRoutes.put("/:id/toggle-payment", jobsController_1.togglePaymentReceived);
exports.default = jobRoutes;
