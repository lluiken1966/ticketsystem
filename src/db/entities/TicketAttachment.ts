import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Ticket } from "./Ticket";

@Entity("TICKET_ATTACHMENTS")
export class TicketAttachment {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket!: Ticket;

  @Column({ name: "ticket_id", type: "number" })
  ticketId!: number;

  @Column({ type: "varchar2", length: 255 })
  filename!: string;

  @Column({ type: "varchar2", length: 1000 })
  filepath!: string;

  @Column({ type: "number" })
  filesize!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
