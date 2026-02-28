import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "REVIEW" | "DONE";

@Entity("TICKETS")
export class Ticket {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @Column({ type: "varchar2", length: 500 })
  title!: string;

  @Column({ type: "clob" })
  description!: string;

  @Column({ name: "acceptance_criteria", type: "clob" })
  acceptanceCriteria!: string;

  @Column({ name: "affected_module", type: "varchar2", length: 255 })
  affectedModule!: string;

  @Column({ type: "varchar2", length: 20, default: "MEDIUM" })
  priority!: TicketPriority;

  @Column({ type: "varchar2", length: 20, default: "OPEN" })
  status!: TicketStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: "assignee_id" })
  assignee!: User | null;

  @Column({ name: "assignee_id", type: "number", nullable: true })
  assigneeId!: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "creator_id" })
  creator!: User;

  @Column({ name: "creator_id", type: "number" })
  creatorId!: number;

  @Column({ name: "awaiting_client", type: "decimal", precision: 1, scale: 0, default: 0 })
  awaitingClient!: number;

  @Column({ type: "decimal", precision: 1, scale: 0, default: 0 })
  approved!: number;

  @Column({ name: "branch_name", type: "varchar2", length: 255, nullable: true })
  branchName!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
