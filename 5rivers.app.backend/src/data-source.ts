// src/data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import { Company } from "./entities/Company";
import { Dispatcher } from "./entities/Dispatcher";
import { Driver } from "./entities/Driver";
import { JobType } from "./entities/JobType";
import { Unit } from "./entities/Unit";
import { Job } from "./entities/Job";
import { Invoice } from "./entities/Invoice";
import { InvoiceLine } from "./entities/InvoiceLine";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./db/5rivers.sqlite",
  synchronize: false, // set to true only in dev
  logging: false,
  entities: [
    Company,
    Dispatcher,
    Driver,
    JobType,
    Unit,
    Job,
    Invoice,
    InvoiceLine,
  ],
});
