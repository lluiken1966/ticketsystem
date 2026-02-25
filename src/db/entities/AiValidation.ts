import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Ticket } from "./Ticket";

@Entity("AI_VALIDATIONS")
export class AiValidation {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket!: Ticket;

  @Column({ name: "ticket_id", type: "number" })
  ticketId!: number;

  @Column({ name: "is_complete", type: "decimal", precision: 1, scale: 0, default: 0 })
  isComplete!: number;

  @Column({ type: "clob", nullable: true })
  feedback!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
