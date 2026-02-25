/**
 * Seeds the database with an initial admin user.
 *   npm run db:seed
 *
 * Default credentials:
 *   Email:    admin@ticketsystem.local
 *   Password: Admin123!
 *   (Change this immediately after first login)
 */
import "reflect-metadata";
import * as bcrypt from "bcryptjs";
import { getDataSource } from "./data-source";
import { User } from "./entities/User";

async function seed() {
  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);

  const email = "admin@ticketsystem.local";
  const existing = await userRepo.findOne({ where: { email } });

  if (existing) {
    console.log("Admin user already exists — skipping seed.");
    await ds.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash("Admin123!", 12);
  const admin = userRepo.create({
    name: "Administrator",
    email,
    passwordHash,
    role: "ADMIN",
  });

  await userRepo.save(admin);
  console.log("✓ Admin user created:");
  console.log("  Email:    admin@ticketsystem.local");
  console.log("  Password: Admin123!");
  console.log("  ⚠️  Change this password immediately after first login!");

  await ds.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
