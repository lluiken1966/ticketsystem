/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Used to kick off the background job processor.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startJobProcessor } = await import("./lib/jobs");
    startJobProcessor();
  }
}
