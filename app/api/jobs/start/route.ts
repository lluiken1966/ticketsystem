/**
 * This route starts the background job processor.
 * It's called once when the app boots via next.config instrumentation.
 * GET /api/jobs/start
 */
import { NextResponse } from "next/server";
import { startJobProcessor } from "@/lib/jobs";

let started = false;

export async function GET() {
  if (!started) {
    startJobProcessor();
    started = true;
  }
  return NextResponse.json({ status: "running" });
}
