"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/companies.ts
const express_1 = require("express");
const companiesController_1 = require("../controllers/companiesController");
const companyRoutes = (0, express_1.Router)();
companyRoutes.get("/", companiesController_1.getCompanies);
companyRoutes.get("/:id", companiesController_1.getCompanyById);
companyRoutes.post("/", companiesController_1.createCompany);
companyRoutes.put("/:id", companiesController_1.updateCompany);
companyRoutes.delete("/:id", companiesController_1.deleteCompany);
exports.default = companyRoutes;
