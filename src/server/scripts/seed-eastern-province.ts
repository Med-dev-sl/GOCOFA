import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getDatabase } from "../database/neon";
import { easternProvinceDistricts } from "../seeds/eastern-province";

async function seed() {
  const sql = getDatabase();

  for (const district of easternProvinceDistricts) {
    const districtRows = await sql`
      INSERT INTO districts (name, code)
      VALUES (${district.name}, ${district.code})
      ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
      RETURNING id
    `;

    const districtId = districtRows[0].id;

    for (const chiefdom of district.chiefdoms) {
      await sql`
        INSERT INTO chiefdoms (district_id, name)
        VALUES (${districtId}, ${chiefdom})
        ON CONFLICT (district_id, name) DO NOTHING
      `;
    }
  }

  console.log("Eastern Province districts and chiefdoms seeded.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
