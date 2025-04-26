"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
// src/data-source.ts
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const Company_1 = require("./entities/Company");
const Dispatcher_1 = require("./entities/Dispatcher");
const Driver_1 = require("./entities/Driver");
const JobType_1 = require("./entities/JobType");
const Unit_1 = require("./entities/Unit");
const Job_1 = require("./entities/Job");
const Invoice_1 = require("./entities/Invoice");
const InvoiceLine_1 = require("./entities/InvoiceLine");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.AppDataSource = new typeorm_1.DataSource({
    type: "mssql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    synchronize: false,
    logging: false,
    entities: [
        Company_1.Company,
        Dispatcher_1.Dispatcher,
        Driver_1.Driver,
        JobType_1.JobType,
        Unit_1.Unit,
        Job_1.Job,
        Invoice_1.Invoice,
        InvoiceLine_1.InvoiceLine,
    ],
    options: { encrypt: true }, // Azure SQL
});
