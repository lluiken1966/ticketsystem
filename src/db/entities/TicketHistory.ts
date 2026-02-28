import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from "typeorm";
import { Ticket } from "./Ticket";
import { User } from "./User";

@Entity("TICKET_HISTORY")
export class TicketHistory {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket!: Ticket;

  // store foreign key id separately for easier querying
  @RelationId((history: TicketHistory) => history.ticket)
  ticketId!: number;

  @Column({ name: "from_status", type: "varchar2", length: 20, nullable: true })
  fromStatus!: string | null;

  @Column({ name: "to_status", type: "varchar2", length: 20 })
  toStatus!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "changed_by_id" })
  changedBy!: User;

  @RelationId((history: TicketHistory) => history.changedBy)
  changedById!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
