import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";

export type UserRole = "CLIENT" | "DEVELOPER" | "ADMIN" | "MANAGER";

@Entity("USERS")
export class User {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @Column({ type: "varchar2", length: 255 })
  name!: string;

  @Column({ type: "varchar2", length: 255, unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "varchar2", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar2", length: 20 })
  role!: UserRole;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
