import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { JobType } from "./JobType";
import { Driver } from "./Driver";
import { Dispatcher } from "./Dispatcher";
import { Unit } from "./Unit";
import { Invoice } from "./Invoice";

@Entity("Jobs")
export class Job {
  @PrimaryGeneratedColumn("uuid", { name: "jobId" })
  jobId!: string;

  @Column({ name: "title", length: 255 })
  title!: string;

  @Column({ name: "dateOfJob", type: "date" })
  dateOfJob!: string;

  @Column({ name: "dayOfJob", length: 50, nullable: true })
  dayOfJob?: string;

  @Column({ name: "startTimeForDriver", length: 50, nullable: true })
  startTimeForDriver?: string;

  @Column({ name: "endTimeForDriver", length: 50, nullable: true })
  endTimeForDriver?: string;

  @Column({ name: "startTimeForJob", length: 50, nullable: true })
  startTimeForJob?: string;

  @Column({ name: "endTimeForJob", length: 50, nullable: true })
  endTimeForJob?: string;

  @Column({ name: "hoursOfDriver", type: "real", nullable: true, default: 0 })
  hoursOfDriver!: number;

  @Column({ name: "hoursOfJob", type: "real", nullable: true, default: 0 })
  hoursOfJob!: number;

  @Column({ name: "dispatchType", length: 100, nullable: true })
  dispatchType?: string;

  @Column({ name: "jobGrossAmount", type: "real", nullable: true, default: 0 })
  jobGrossAmount!: number;

  @Column({ name: "driverRate", type: "real", nullable: true, default: 0 })
  driverRate!: number;

  @Column({ name: "driverPay", type: "real", nullable: true, default: 0 })
  driverPay!: number;

  @Column({ name: "estimatedFuel", type: "real", nullable: true, default: 0 })
  estimatedFuel!: number;

  @Column({
    name: "estimatedRevenue",
    type: "real",
    nullable: true,
    default: 0,
  })
  estimatedRevenue!: number;

  @Column({ name: "imageUrls", type: "text", nullable: true })
  imageUrls?: string;

  @Column({ name: "ticketIds", type: "text", nullable: true })
  ticketIds?: string;

  @Column({ name: "weight", type: "text", nullable: true })
  weight?: string;

  @Column({ name: "loads", type: "real", nullable: true, default: 0 })
  loads!: number;

  @Column({ name: "invoiceId", type: "uuid", nullable: true })
  invoiceId?: string;

  @Column({ name: "invoiceStatus", length: 20, default: "Pending" })
  invoiceStatus!: string;

  @CreateDateColumn({ name: "createdAt", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "datetime" })
  updatedAt!: Date;

  @Column({ name: "driverName", length: 255, nullable: true })
  driverName?: string;

  @Column({ name: "unitId", type: "uuid", nullable: true })
  unitId?: string;

  @Column({ name: "jobTypeId", type: "uuid", nullable: true })
  jobTypeId?: string;

  @Column({ name: "driverId", type: "uuid", nullable: true })
  driverId?: string;

  @Column({ name: "dispatcherId", type: "uuid", nullable: true })
  dispatcherId?: string;

  // Relations
  @ManyToOne(() => JobType, { nullable: true })
  @JoinColumn({ name: "jobTypeId" })
  jobType?: JobType;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: "driverId" })
  driver?: Driver;

  @ManyToOne(() => Dispatcher, { nullable: true })
  @JoinColumn({ name: "dispatcherId" })
  dispatcher?: Dispatcher;

  @ManyToOne(() => Unit, { nullable: true })
  @JoinColumn({ name: "unitId" })
  unit?: Unit;

  @ManyToOne(() => Invoice, { nullable: true })
  @JoinColumn({ name: "invoiceId" })
  invoice?: Invoice;
}
