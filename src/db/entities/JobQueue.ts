import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export type JobStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
export type JobType = "VALIDATE_TICKET" | "ANALYZE_CODE";

@Entity("JOB_QUEUE")
export class JobQueue {
  @PrimaryGeneratedColumn({ type: "number" })
  id!: number;

  @Column({ name: "job_type", type: "varchar2", length: 50 })
  jobType!: JobType;

  @Column({ type: "clob" })
  payload!: string;

  @Column({ type: "varchar2", length: 20, default: "PENDING" })
  status!: JobStatus;

  @Column({ name: "error_message", type: "clob", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ name: "processed_at", type: "timestamp", nullable: true })
  processedAt!: Date | null;
}
