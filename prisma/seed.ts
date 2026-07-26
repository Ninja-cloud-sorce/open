import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEFAULT_COLLECTIONS = [
  "Minimal",
  "Editorial",
  "Apple",
  "Brutalist",
  "Print",
  "AI",
  "SaaS",
  "Landing Pages",
  "Typography",
  "Components",
  "Uncategorized",
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function faviconUrl(siteUrl: string) {
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(siteUrl)}`;
}

const DEFAULT_SOURCES = [
  { name: "Pinterest", url: "https://www.pinterest.com" },
  { name: "Awwwards", url: "https://www.awwwards.com" },
  { name: "LottieFiles", url: "https://lottiefiles.com" },
];

async function main() {
  for (const name of DEFAULT_COLLECTIONS) {
    await db.collection.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name), isDefault: true },
    });
  }

  const existingSources = await db.inspirationSource.count();
  if (existingSources === 0) {
    await db.inspirationSource.createMany({
      data: DEFAULT_SOURCES.map((source, index) => ({
        name: source.name,
        url: source.url,
        faviconUrl: faviconUrl(source.url),
        order: index,
      })),
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
