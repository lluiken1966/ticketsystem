import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";

@Entity("APP_CONFIG")
export class AppConfig {
  @PrimaryColumn({ name: "config_key", type: "varchar2", length: 100 })
  configKey!: string;

  @Column({ name: "config_value", type: "clob", nullable: true })
  configValue!: string | null;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
