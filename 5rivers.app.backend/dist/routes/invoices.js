"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/invoices.ts
const express_1 = require("express");
const invoicesController_1 = require("../controllers/invoicesController");
// Utility to wrap async route handlers
const asyncHandler = (fn) => (req, res, next) => {
    // TODO: Replace 'any' with a specific type for these parameters
    Promise.resolve(fn(req, res, next)).catch(next);
};
const invoiceRoutes = (0, express_1.Router)();
invoiceRoutes.get("/", invoicesController_1.getInvoices);
invoiceRoutes.get("/:id", invoicesController_1.getInvoiceById);
invoiceRoutes.post("/", invoicesController_1.createInvoice);
invoiceRoutes.put("/:id", invoicesController_1.updateInvoice);
invoiceRoutes.delete("/:id", invoicesController_1.deleteInvoice);
invoiceRoutes.get("/:id/pdf", asyncHandler(invoicesController_1.downloadInvoicePdf));
invoiceRoutes.get("/:id/jobs", asyncHandler(invoicesController_1.getInvoiceJobs));
exports.default = invoiceRoutes;
