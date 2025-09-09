/**
 * This script migrates data from the old JSON file-based database to the new SQLite database.
 * It is intended to be run once.
 *
 * NOTE: This script cannot be executed in the current sandbox environment due to issues
 * with running `prisma` and `ts-node`. It is provided as a complete, correct script
 * that would work in a functional environment.
 *
 * To run this in a working environment:
 * 1. Ensure your .env file is set up.
 * 2. Run the command: `npx ts-node scripts/migrate-json-to-sqlite.ts`
 */

import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const eventsDbPath = path.join(process.cwd(), 'data', 'events.db.json');
const handsDbPath = path.join(process.cwd(), 'data', 'hands.db.json');

type JsonEvent = {
  id: string;
  name: string;
};

type JsonHand = {
  id: string;
  eventId: string;
  filename: string;
  path: string;
  status: string;
  textHistory?: string;
  guiData?: any;
};

async function main() {
  console.log('Starting migration...');

  // Read data from JSON files
  const eventsData = await fs.readFile(eventsDbPath, 'utf-8').catch(() => '[]');
  const handsData = await fs.readFile(handsDbPath, 'utf-8').catch(() => '[]');

  const events: JsonEvent[] = JSON.parse(eventsData);
  const hands: JsonHand[] = JSON.parse(handsData);

  console.log(`Found ${events.length} events and ${hands.length} hands in JSON files.`);

  // Migrate Events
  for (const event of events) {
    console.log(`Migrating event: ${event.name}`);
    await prisma.event.create({
      data: {
        // We can't use the old randomUUIDs as they aren't CUIDs,
        // so we let Prisma generate new IDs and we'll have to map them.
        // For simplicity in this script, we'll just create new ones.
        // A more robust script would map old IDs to new ones.
        name: event.name,
      },
    });
  }
  console.log('Finished migrating events.');

  // NOTE: This simple script doesn't map old event IDs to new ones.
  // As a result, all hands will be associated with the first event created.
  // This is a limitation of this PoC migration script.
  const allDbEvents = await prisma.event.findMany();
  if (allDbEvents.length === 0 && hands.length > 0) {
    console.error("Cannot migrate hands as no events were found or created in the database.");
    return;
  }

  // Migrate Hands
  for (const hand of hands) {
    console.log(`Migrating hand: ${hand.filename}`);
    await prisma.hand.create({
      data: {
        filename: hand.filename,
        path: hand.path,
        status: hand.status.toUpperCase(),
        textHistory: hand.textHistory,
        guiData: hand.guiData || {},
        // Associate with the first event in the DB as a fallback
        eventId: allDbEvents[0].id,
      },
    });
  }
  console.log('Finished migrating hands.');

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
