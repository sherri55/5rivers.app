// src/entities/Unit.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("Units")
export class Unit {
  @PrimaryGeneratedColumn("uuid", { name: "unitId" })
  unitId!: string;

  @Column({ name: "name", length: 255 })
  name!: string;

  @Column({ name: "description", length: 255, nullable: true })
  description?: string;

  @CreateDateColumn({ name: "createdAt", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "datetime" })
  updatedAt!: Date;
}
