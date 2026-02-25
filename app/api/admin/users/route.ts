import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { User } from "@/src/db/entities/User";
import * as bcrypt from "bcryptjs";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ds = await getDataSource();
  const users = await ds.getRepository(User).find({ order: { createdAt: "DESC" } });
  // Never return password hashes
  return NextResponse.json(users.map(({ passwordHash: _, ...u }) => u));
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, email, password, role } = await req.json();
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const ds = await getDataSource();
  const existing = await ds.getRepository(User).findOne({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = ds.getRepository(User).create({ name, email, passwordHash, role });
  const saved = await ds.getRepository(User).save(user);
  const { passwordHash: _, ...result } = saved;
  return NextResponse.json(result, { status: 201 });
}
