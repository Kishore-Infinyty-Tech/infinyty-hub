// Uploads portal/seed-images/*.webp to the private B2 bucket and points the seeded posts at them.
// Safe to re-run: same file names overwrite the same keys.
import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const s3 = new S3Client({
  endpoint: env.B2_ENDPOINT,
  region: env.B2_REGION,
  credentials: { accessKeyId: env.B2_KEY_ID, secretAccessKey: env.B2_APPLICATION_KEY },
});
const db = new pg.Client({ connectionString: env.DATABASE_URL });
await db.connect();

// file -> the post title it belongs to (matched by start of title)
const MAP = {
  "01-welcome.webp": "Welcome to the new Infinyty Hub",
  "02-acme-deal.webp": "Alex Johnson closes the $500k Acme Corp deal",
  "03-hyderabad-office.webp": "Our Hyderabad office is open",
  "04-state-award.webp": "Infinyty honoured at the State Digital Excellence Awards",
  "05-prototype-loop.webp": "Kishore ships the prototype loop",
  "06-town-hall.webp": "Q3 town hall",
};

const dir = new URL("../seed-images/", import.meta.url);
for (const file of readdirSync(dir).filter((f) => MAP[f])) {
  const key = `posts/seed/${file}`;
  await s3.send(new PutObjectCommand({
    Bucket: env.B2_BUCKET, Key: key, Body: readFileSync(new URL(file, dir)),
    ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable",
  }));
  const r = await db.query("update portal.posts set image_url = $1 where title like $2", [`/api/media/${key}`, `${MAP[file]}%`]);
  console.log(file, "-> uploaded, posts updated:", r.rowCount);
}
await db.end();
