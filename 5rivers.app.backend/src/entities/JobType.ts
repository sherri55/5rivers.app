// src/entities/JobType.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { Company } from "./Company";
import { Job } from "./Job";

@Entity("JobTypes")
export class JobType {
  @PrimaryGeneratedColumn("uuid", { name: "jobTypeId" })
  jobTypeId!: string;

  @Column({ name: "title", length: 255 })
  title!: string;

  @Column({ name: "startLocation", length: 255, nullable: true })
  startLocation?: string;

  @Column({ name: "endLocation", length: 255, nullable: true })
  endLocation?: string;

  @Column({ name: "dispatchType", length: 255, nullable: true })
  dispatchType?: string;

  @Column({ name: "rateOfJob", type: "real", default: 0 })
  rateOfJob!: number;

  @CreateDateColumn({ name: "createdAt", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "datetime" })
  updatedAt!: Date;

  @Column({ name: "companyId", type: "uuid" })
  companyId!: string;
}
