// src/entities/Driver.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";

@Entity("Drivers")
export class Driver {
  @PrimaryGeneratedColumn("uuid", { name: "driverId" }) // primary key
  driverId!: string;

  @Column({ name: "name", length: 255 })
  name!: string;

  @Column({ name: "description", length: 255, nullable: true })
  description?: string;

  @Column({ name: "email", length: 255, nullable: true })
  email?: string;

  @Column({ name: "phone", length: 255, nullable: true })
  phone?: string;

  @Column({ name: "hourlyRate", type: "real", default: 0 })
  hourlyRate!: number;

  @CreateDateColumn({ name: "createdAt", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "datetime" })
  updatedAt!: Date;
}
