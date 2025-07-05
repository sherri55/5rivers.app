import PDFDocument from "pdfkit";

declare module "pdfkit" {
  interface PDFDocument {
    table: (table: any, options?: any) => Promise<void>;
  }
}
