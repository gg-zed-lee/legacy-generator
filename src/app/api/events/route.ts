import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

type TournamentEvent = {
  id: string;
  name: string;
};

// Path to the JSON file that will act as our database
const dbPath = path.join(process.cwd(), 'data', 'events.db.json');

// Helper function to read events from the database file
async function getEvents(): Promise<TournamentEvent[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty array
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Helper function to write events to the database file
async function saveEvents(events: TournamentEvent[]): Promise<void> {
  // Ensure the data directory exists
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(events, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read events data.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'Event name is required.' }, { status: 400 });
    }

    const events = await getEvents();
    const newEvent: TournamentEvent = {
      id: randomUUID(),
      name: name.trim(),
    };

    events.push(newEvent);
    await saveEvents(events);

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create event.' }, { status: 500 });
  }
}
