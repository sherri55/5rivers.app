// routes/invoices.ts
import { Router } from "express";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoiceJobs,
} from "../controllers/invoicesController";

// Utility to wrap async route handlers
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  // TODO: Replace 'any' with a specific type for these parameters
  Promise.resolve(fn(req, res, next)).catch(next);
};

const invoiceRoutes = Router();
invoiceRoutes.get("/", getInvoices);
invoiceRoutes.get("/:id", getInvoiceById);
invoiceRoutes.post("/", createInvoice);
invoiceRoutes.put("/:id", updateInvoice);
invoiceRoutes.delete("/:id", deleteInvoice);
invoiceRoutes.get("/:id/pdf", asyncHandler(downloadInvoicePdf));
invoiceRoutes.get("/:id/jobs", asyncHandler(getInvoiceJobs));
export default invoiceRoutes;
