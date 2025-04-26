// src/entities/Invoice.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { InvoiceLine } from "./InvoiceLine";

@Entity("Invoices")
export class Invoice {
  @PrimaryGeneratedColumn("uuid", { name: "invoiceId" }) // primary key
  invoiceId!: string;

  @Column({ name: "invoiceNumber", length: 255, unique: true })
  invoiceNumber!: string;

  @Column({ name: "invoiceDate", type: "datetime" })
  invoiceDate!: Date;

  @Column({ name: "subTotal", type: "real", default: 0 })
  subTotal!: number;

  @Column({ name: "dispatchPercent", type: "real", default: 0 })
  dispatchPercent!: number;

  @Column({ name: "comm", type: "real", default: 0 })
  comm!: number;

  @Column({ name: "hst", type: "real", default: 0 })
  hst!: number;

  @Column({ name: "total", type: "real", default: 0 })
  total!: number;

  @Column({ name: "billedTo", length: 255, nullable: true })
  billedTo?: string;

  @Column({ name: "billedEmail", length: 255, nullable: true })
  billedEmail?: string;

  @CreateDateColumn({ name: "createdAt", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "datetime" })
  updatedAt!: Date;

  @OneToMany(() => InvoiceLine, (line) => line.invoice)
  lines!: InvoiceLine[];
}
