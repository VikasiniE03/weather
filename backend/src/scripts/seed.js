import bcrypt from "bcryptjs";
import { STATIONS } from "../config/stations.js";
import { repository } from "../database/repository.js";
import { dbConnection } from "../database/db.js";

export async function seedDatabase(force = false) {
  try {
    await dbConnection.connect();

    // Check if admin user already exists
    const existingAdmin = await repository.findUserByEmail("admin@aerosense.gov.in");
    if (existingAdmin && !force) {
      // Ensure stations are seeded
      for (const stn of STATIONS) {
        await repository.upsertStation(stn);
      }
      return { seeded: false, message: "Database already initialized." };
    }

    console.log("🌱 [SEED] Initializing default roles, demo operators, and weather stations...");

    // Password hashes
    const adminHash = await bcrypt.hash("Admin@12345", 10);
    const operatorHash = await bcrypt.hash("Operator@12345", 10);

    // 1. Seed Admin
    if (!existingAdmin) {
      await repository.createUser({
        userId: "USR-ADMIN-01",
        email: "admin@aerosense.gov.in",
        passwordHash: adminHash,
        name: "Chief Meteorological Director",
        role: "admin",
        assignedStationId: null,
        phone: "+91 94440 00001",
        status: "ACTIVE"
      });
      console.log("   ✓ Created Admin: admin@aerosense.gov.in (Admin@12345)");
    }

    // 2. Seed 5 Station Operators
    for (let i = 0; i < STATIONS.length; i++) {
      const stn = STATIONS[i];
      const op = stn.operator;
      const email = op.email;

      const existingOp = await repository.findUserByEmail(email);
      if (!existingOp) {
        await repository.createUser({
          userId: `USR-${op.id}`,
          email,
          passwordHash: operatorHash,
          name: op.name,
          role: "operator",
          assignedStationId: stn.id,
          phone: op.phone,
          status: "ACTIVE"
        });
        console.log(`   ✓ Created Operator: ${email} (Operator@12345) -> Assigned to ${stn.id}`);
      }

      // Upsert station
      await repository.upsertStation(stn);
    }

    await repository.logAudit("DATABASE_SEEDED", { name: "System", role: "system" }, null, {
      stationsCount: STATIONS.length
    });

    console.log("🌱 [SEED] Seed completed successfully.");
    return { seeded: true, message: "Database seeded successfully." };
  } catch (err) {
    console.error("❌ [SEED] Error seeding database:", err);
    throw err;
  }
}

// Allow standalone execution via `node backend/src/scripts/seed.js`
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedDatabase(true).then(() => process.exit(0)).catch(() => process.exit(1));
}
