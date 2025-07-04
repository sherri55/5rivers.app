"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const companies_1 = __importDefault(require("./routes/companies"));
const drivers_1 = __importDefault(require("./routes/drivers"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const units_1 = __importDefault(require("./routes/units"));
const dispatchers_1 = __importDefault(require("./routes/dispatchers"));
const jobtypes_1 = __importDefault(require("./routes/jobtypes"));
const auth_1 = __importDefault(require("./routes/auth"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express_1.default.json());
app.use("/companies", companies_1.default);
app.use("/drivers", drivers_1.default);
app.use("/jobs", jobs_1.default);
app.use("/invoices", invoices_1.default);
app.use("/units", units_1.default);
app.use("/dispatchers", dispatchers_1.default);
app.use("/jobtypes", jobtypes_1.default);
app.use("/auth", auth_1.default);
app.listen(9999, '0.0.0.0', () => console.log("Server running at " + (process.env.NEXT_PUBLIC_API_URL || "http://localhost:9999")));
exports.default = app;
