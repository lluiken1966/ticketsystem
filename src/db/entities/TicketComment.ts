import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Ticket } from "./Ticket";
import { User } from "./User";

@Entity("TICKET_COMMENTS")
export class TicketComment {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket!: Ticket;

  @Column({ name: "ticket_id", type: "number" })
  ticketId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id", type: "number" })
  userId!: number;

  @Column({ type: "clob" })
  content!: string;

  @Column({ name: "is_internal", type: "decimal", precision: 1, scale: 0, default: 0 })
  isInternal!: number;

  @Column({ name: "is_client_question", type: "decimal", precision: 1, scale: 0, default: 0 })
  isClientQuestion!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
