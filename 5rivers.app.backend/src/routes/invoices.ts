// routes/invoices.ts
import { Router } from "express";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoicesController";
const invoiceRoutes = Router();
invoiceRoutes.get("/", getInvoices);
invoiceRoutes.get("/:id", getInvoiceById);
invoiceRoutes.post("/", createInvoice);
invoiceRoutes.put("/:id", updateInvoice);
invoiceRoutes.delete("/:id", deleteInvoice);
export default invoiceRoutes;
