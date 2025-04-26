// src/entities/Dispatcher.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";

@Entity("Dispatchers")
export class Dispatcher {
  @PrimaryGeneratedColumn("uuid", { name: "dispatcherId" }) // primary key
  dispatcherId!: string;

  @Column({ name: "name", length: 255 })
  name!: string;

  @Column({ name: "description", length: 255, nullable: true })
  description?: string;

  @Column({ name: "email", length: 255, nullable: true })
  email?: string;

  @Column({ name: "phone", length: 255, nullable: true })
  phone?: string;

  @Column({ name: "commission", type: "real", default: 0 })
  commission!: number;

  @CreateDateColumn({ name: "createdAt", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "datetime" })
  updatedAt!: Date;
}
