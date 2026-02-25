import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Ticket } from "./Ticket";

export interface CodeLocation {
  file_path: string;
  start_line: number;
  end_line: number;
  explanation: string;
}

@Entity("AI_CODE_ANALYSES")
export class AiCodeAnalysis {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket!: Ticket;

  @Column({ name: "ticket_id", type: "number" })
  ticketId!: number;

  // Stored as JSON string in CLOB
  @Column({ type: "clob" })
  results!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  getParsedResults(): CodeLocation[] {
    try {
      return JSON.parse(this.results);
    } catch {
      return [];
    }
  }
}
