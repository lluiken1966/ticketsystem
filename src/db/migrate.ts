/**
 * Run this once to create all tables in Oracle:
 *   npm run db:migrate
 */
import "reflect-metadata";
import * as oracledb from "oracledb";

async function migrate() {
  const connString = process.env.ORACLE_SERVICE!;
  process.env.TNS_ADMIN = process.env.TNS_ADMIN || "./wallet";

  const conn = await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: connString,
  });

  const ddlStatements = [
    `CREATE TABLE USERS (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        VARCHAR2(255) NOT NULL,
      email       VARCHAR2(255) NOT NULL UNIQUE,
      password_hash VARCHAR2(255) NOT NULL,
      role        VARCHAR2(20)  NOT NULL CHECK (role IN ('CLIENT','DEVELOPER','ADMIN','MANAGER')),
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE TICKETS (
      id                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title                VARCHAR2(500) NOT NULL,
      description          CLOB NOT NULL,
      acceptance_criteria  CLOB NOT NULL,
      affected_module      VARCHAR2(255) NOT NULL,
      priority             VARCHAR2(20) DEFAULT 'MEDIUM' NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
      status               VARCHAR2(20) DEFAULT 'OPEN' NOT NULL CHECK (status IN ('OPEN','IN_PROGRESS','REVIEW','DONE')),
      assignee_id          NUMBER REFERENCES USERS(id),
      creator_id           NUMBER NOT NULL REFERENCES USERS(id),
      awaiting_client      NUMBER(1,0) DEFAULT 0 NOT NULL,
      created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE TICKET_COMMENTS (
      id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ticket_id           NUMBER NOT NULL REFERENCES TICKETS(id) ON DELETE CASCADE,
      user_id             NUMBER NOT NULL REFERENCES USERS(id),
      content             CLOB NOT NULL,
      is_internal         NUMBER(1,0) DEFAULT 0 NOT NULL,
      is_client_question  NUMBER(1,0) DEFAULT 0 NOT NULL,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE TICKET_ATTACHMENTS (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ticket_id   NUMBER NOT NULL REFERENCES TICKETS(id) ON DELETE CASCADE,
      filename    VARCHAR2(255) NOT NULL,
      filepath    VARCHAR2(1000) NOT NULL,
      filesize    NUMBER NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE TICKET_HISTORY (
      id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ticket_id     NUMBER NOT NULL REFERENCES TICKETS(id) ON DELETE CASCADE,
      from_status   VARCHAR2(20),
      to_status     VARCHAR2(20) NOT NULL,
      changed_by_id NUMBER NOT NULL REFERENCES USERS(id),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE AI_VALIDATIONS (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ticket_id   NUMBER NOT NULL REFERENCES TICKETS(id) ON DELETE CASCADE,
      is_complete NUMBER(1,0) DEFAULT 0 NOT NULL,
      feedback    CLOB,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE AI_CODE_ANALYSES (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ticket_id   NUMBER NOT NULL REFERENCES TICKETS(id) ON DELETE CASCADE,
      results     CLOB NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE APP_CONFIG (
      config_key    VARCHAR2(100) PRIMARY KEY,
      config_value  CLOB,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE JOB_QUEUE (
      id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      job_type      VARCHAR2(50) NOT NULL,
      payload       CLOB NOT NULL,
      status        VARCHAR2(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING','PROCESSING','DONE','FAILED')),
      error_message CLOB,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      processed_at  TIMESTAMP
    )`,
  ];

  for (const ddl of ddlStatements) {
    const tableName = ddl.match(/CREATE TABLE (\w+)/)?.[1];
    try {
      await conn.execute(ddl);
      console.log(`✓ Created table: ${tableName}`);
    } catch (err: any) {
      if (err.errorNum === 955) {
        console.log(`  Table ${tableName} already exists — skipping`);
      } else {
        console.error(`✗ Error creating ${tableName}:`, err.message);
      }
    }
  }

  await conn.commit();
  await conn.close();
  console.log("\nMigration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
