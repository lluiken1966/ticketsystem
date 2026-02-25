/**
 * Simple Oracle-backed job queue.
 * Jobs are written to JOB_QUEUE table and processed by a background polling loop.
 * The processor is started once when the Next.js server boots (via api/jobs/start).
 */
import { getDataSource } from "@/src/db/data-source";
import { JobQueue, JobType } from "@/src/db/entities/JobQueue";
import { validateTicket } from "@/lib/ai/validator";
import { analyzeCode } from "@/lib/ai/codeSearcher";

export async function enqueueJob(jobType: JobType, payload: object) {
  const ds = await getDataSource();
  const job = ds.getRepository(JobQueue).create({
    jobType,
    payload: JSON.stringify(payload),
    status: "PENDING",
  });
  await ds.getRepository(JobQueue).save(job);
}

async function processJob(job: JobQueue) {
  const payload = JSON.parse(job.payload);
  if (job.jobType === "VALIDATE_TICKET") {
    await validateTicket(payload.ticketId);
  } else if (job.jobType === "ANALYZE_CODE") {
    await analyzeCode(payload.ticketId);
  }
}

let processorRunning = false;

export function startJobProcessor() {
  if (processorRunning) return;
  processorRunning = true;

  async function poll() {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(JobQueue);

      // Fetch one pending job at a time
      const job = await repo
        .createQueryBuilder("j")
        .where("j.status = :status", { status: "PENDING" })
        .orderBy("j.createdAt", "ASC")
        .getOne();

      if (job) {
        job.status = "PROCESSING";
        await repo.save(job);

        try {
          await processJob(job);
          job.status = "DONE";
          job.processedAt = new Date();
        } catch (err: any) {
          job.status = "FAILED";
          job.errorMessage = err?.message || String(err);
          job.processedAt = new Date();
          console.error(`Job ${job.id} (${job.jobType}) failed:`, err);
        }

        await repo.save(job);
      }
    } catch (err) {
      console.error("Job processor poll error:", err);
    }

    // Poll every 5 seconds
    setTimeout(poll, 5000);
  }

  poll();
  console.log("Job processor started (polling every 5s)");
}
