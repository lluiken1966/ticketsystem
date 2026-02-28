/**
 * Seeds the database with one user per role.
 *   npm run db:seed
 */
import "reflect-metadata";
import * as bcrypt from "bcryptjs";
import { getDataSource } from "./data-source";
import { User, UserRole } from "./entities/User";

const SEED_USERS: { name: string; email: string; password: string; role: UserRole }[] = [
  { name: "Administrator",   email: "admin@ticketsystem.local",     password: "Admin123!",     role: "ADMIN" },
  { name: "Mees Manager",    email: "manager@ticketsystem.local",   password: "Manager123!",   role: "MANAGER" },
  { name: "Dave Developer",  email: "developer@ticketsystem.local", password: "Developer123!", role: "DEVELOPER" },
  { name: "Claire Client",   email: "client@ticketsystem.local",    password: "Client123!",    role: "CLIENT" },
];

async function seed() {
  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);

  let created = 0;
  let skipped = 0;

  for (const u of SEED_USERS) {
    const existing = await userRepo.findOne({ where: { email: u.email } });
    if (existing) {
      console.log(`  skipped  ${u.role.padEnd(10)} — ${u.email} already exists`);
      skipped++;
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 12);
    await userRepo.save(userRepo.create({ name: u.name, email: u.email, passwordHash, role: u.role }));
    console.log(`✓ created  ${u.role.padEnd(10)} — ${u.email}  /  ${u.password}`);
    created++;
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
  await ds.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
