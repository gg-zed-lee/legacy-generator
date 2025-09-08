import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type Hand = {
  id: string;
  eventId: string;
  filename: string;
  path: string;
  status: 'uploaded' | 'processing' | 'needs_review' | 'completed';
};

const handsDbPath = path.join(process.cwd(), 'data', 'hands.db.json');

async function getHands(): Promise<Hand[]> {
  try {
    const data = await fs.readFile(handsDbPath, 'utf-8');
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
    handId: string;
  };
};

export async function GET(request: Request, { params }: GetParams) {
  const { handId } = params;
  try {
    const allHands = await getHands();
    const hand = allHands.find((h) => h.id === handId);

    if (!hand) {
      return NextResponse.json({ message: 'Hand not found' }, { status: 404 });
    }

    return NextResponse.json(hand);
  } catch (error) {
    console.error('Failed to get hand:', error);
    return NextResponse.json({ message: 'Failed to read hand data' }, { status: 500 });
  }
}
