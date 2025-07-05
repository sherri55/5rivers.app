import express, { Application } from "express";
import cors from "cors";
import companyRoutes from "./routes/companies";
import driverRoutes from "./routes/drivers";
import jobRoutes from "./routes/jobs";
import invoiceRoutes from "./routes/invoices";
import unitRoutes from "./routes/units";
import dispatcherRoutes from "./routes/dispatchers";
import jobTypeRoutes from "./routes/jobtypes";
import authRoutes from "./routes/auth";

const app: Application = express();

app.use(cors({ 
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://5riverstruckinginc.ca",
    "http://localhost:3000",
  ]
}));
app.use(express.json());

app.use("/companies", companyRoutes);
app.use("/drivers", driverRoutes);
app.use("/jobs", jobRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/units", unitRoutes);
app.use("/dispatchers", dispatcherRoutes);
app.use("/jobtypes", jobTypeRoutes);
app.use("/auth", authRoutes);

app.listen(9999, '0.0.0.0', () => console.log("Server running at " + (process.env.NEXT_PUBLIC_API_URL || "http://localhost:9999")));

export default app;
