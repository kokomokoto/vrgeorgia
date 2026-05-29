// არსებული SQLite ტურების გადატანა MongoDB-ში (ერთჯერადი, იდემპოტენტური).
//
// გაშვება (tour-builder ფოლდერიდან):
//   node --env-file=.env.local migrate-sqlite-to-mongo.mjs
//   ან:  MONGODB_URI="mongodb+srv://..." node migrate-sqlite-to-mongo.mjs
//
// ფოტოები: ძველი ლოკალური ფოტოები /api/uploads/... -ზე რჩება. თუ გინდა რომ
// Cloudinary-ზე გადავიდეს, ხელახლა ატვირთე ფოტო რედაქტორში publish-მდე.

import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import mongoose from "mongoose";

const DB_PATH = path.join(process.cwd(), "data", "tours.db");
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vrgeorgia";

if (!fs.existsSync(DB_PATH)) {
  console.log(`SQLite ბაზა ვერ მოიძებნა: ${DB_PATH} — გადასატანი არაფერია.`);
  process.exit(0);
}

const tourSchema = new mongoose.Schema({}, { strict: false, collection: "tb_tours" });
const sceneSchema = new mongoose.Schema({}, { strict: false, collection: "tb_scenes" });
const hotspotSchema = new mongoose.Schema({}, { strict: false, collection: "tb_hotspots" });

const TourModel = mongoose.model("TbTourMig", tourSchema);
const SceneModel = mongoose.model("TbSceneMig", sceneSchema);
const HotspotModel = mongoose.model("TbHotspotMig", hotspotSchema);

async function main() {
  const db = new Database(DB_PATH, { readonly: true });

  const tours = db.prepare("SELECT * FROM tours").all();
  const scenes = db.prepare("SELECT * FROM scenes").all();
  const hotspots = db.prepare("SELECT * FROM hotspots").all();

  console.log(
    `ნაპოვნია: ${tours.length} ტური, ${scenes.length} სცენა, ${hotspots.length} hotspot.`
  );

  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB დაკავშირებულია.");

  const upsert = async (Model, rows) => {
    let n = 0;
    for (const row of rows) {
      await Model.updateOne({ id: row.id }, { $set: row }, { upsert: true });
      n++;
    }
    return n;
  };

  const t = await upsert(TourModel, tours);
  const s = await upsert(SceneModel, scenes);
  const h = await upsert(HotspotModel, hotspots);

  console.log(`გადატანილია: ${t} ტური, ${s} სცენა, ${h} hotspot.`);

  await mongoose.disconnect();
  db.close();
  console.log("დასრულდა.");
}

main().catch((err) => {
  console.error("Migration შეცდომა:", err);
  process.exit(1);
});
