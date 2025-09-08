import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type TournamentEvent = {
  id: string;
  name: string;
};

const dbPath = path.join(process.cwd(), 'data', 'events.db.json');

async function getEvents(): Promise<TournamentEvent[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

type GetParams = {
  params: {
    eventId: string;
  };
};

export async function GET(request: Request, { params }: GetParams) {
  const { eventId } = params;
  try {
    const events = await getEvents();
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read event data' }, { status: 500 });
  }
}
