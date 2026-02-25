import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Ticket } from "./entities/Ticket";
import { TicketComment } from "./entities/TicketComment";
import { TicketAttachment } from "./entities/TicketAttachment";
import { TicketHistory } from "./entities/TicketHistory";
import { AiValidation } from "./entities/AiValidation";
import { AiCodeAnalysis } from "./entities/AiCodeAnalysis";
import { AppConfig } from "./entities/AppConfig";
import { JobQueue } from "./entities/JobQueue";

export const AppDataSource = new DataSource({
  type: "oracle",
  username: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_SERVICE,
  synchronize: false, // use migrations in production
  logging: process.env.NODE_ENV === "development",
  entities: [
    User,
    Ticket,
    TicketComment,
    TicketAttachment,
    TicketHistory,
    AiValidation,
    AiCodeAnalysis,
    AppConfig,
    JobQueue,
  ],
  migrations: ["src/db/migrations/*.ts"],
});

// Promise-based singleton: concurrent callers await the same init promise
// instead of each triggering their own initialize() call.
let initPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) return AppDataSource;
  if (!initPromise) {
    initPromise = AppDataSource.initialize()
      .then(() => AppDataSource)
      .catch((err) => {
        initPromise = null; // allow retry on transient failure
        throw err;
      });
  }
  return initPromise;
}
