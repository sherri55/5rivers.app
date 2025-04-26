// src/entities/InvoiceLine.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { Invoice } from "./Invoice";
import { Job } from "./Job";

@Entity("InvoiceLines")
export class InvoiceLine {
  @PrimaryGeneratedColumn("uuid")
  invoiceLineId!: string;

  @Column({ type: "real", default: 0 })
  lineAmount!: number;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  @ManyToOne(() => Invoice, (invoice) => invoice.lines, { onDelete: "CASCADE" })
  invoice!: Invoice;

  @ManyToOne(() => Job, (job) => job.invoice, { onDelete: "SET NULL" })
  job!: Job;
}
