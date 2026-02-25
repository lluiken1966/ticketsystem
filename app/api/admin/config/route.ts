import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { AppConfig } from "@/src/db/entities/AppConfig";

const ALLOWED_KEYS = [
  "smtp_host", "smtp_port", "smtp_user", "smtp_from",
  "bitbucket_workspace", "bitbucket_repo",
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ds = await getDataSource();
  const configs = await ds.getRepository(AppConfig).find();
  const result: Record<string, string | null> = {};
  for (const c of configs) {
    if (ALLOWED_KEYS.includes(c.configKey)) {
      result[c.configKey] = c.configValue;
    }
  }
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const ds = await getDataSource();
  const repo = ds.getRepository(AppConfig);

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    const existing = await repo.findOne({ where: { configKey: key } });
    if (existing) {
      existing.configValue = value as string;
      await repo.save(existing);
    } else {
      await repo.save(repo.create({ configKey: key, configValue: value as string }));
    }
  }

  return NextResponse.json({ success: true });
}
