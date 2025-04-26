// src/entities/Company.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";

@Entity("Companies")
export class Company {
  @PrimaryGeneratedColumn("uuid", { name: "companyId" }) // primary key
  companyId!: string;

  @Column({ name: "name", length: 255 })
  name!: string;

  @Column({ name: "description", length: 255, nullable: true })
  description?: string;

  @Column({ name: "email", length: 255, nullable: true })
  email?: string;

  @Column({ name: "phone", length: 255, nullable: true })
  phone?: string;

  @CreateDateColumn({ name: "createdAt", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "datetime" })
  updatedAt!: Date;
}
