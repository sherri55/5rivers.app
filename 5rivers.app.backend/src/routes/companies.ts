// routes/companies.ts
import { Router } from "express";
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/companiesController";
const companyRoutes = Router();
companyRoutes.get("/", getCompanies);
companyRoutes.get("/:id", getCompanyById);
companyRoutes.post("/", createCompany);
companyRoutes.put("/:id", updateCompany);
companyRoutes.delete("/:id", deleteCompany);
export default companyRoutes;
