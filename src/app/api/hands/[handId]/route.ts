import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type GuiData = { [key: string]: any };

type Hand = {
  id: string;
  eventId: string;
  filename: string;
  path: string;
  status: 'uploaded' | 'processing' | 'needs_review' | 'completed';
  textHistory?: string;
  guiData?: GuiData;
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

async function saveHands(hands: Hand[]): Promise<void> {
  await fs.mkdir(path.dirname(handsDbPath), { recursive: true });
  await fs.writeFile(handsDbPath, JSON.stringify(hands, null, 2), 'utf-8');
}

type RouteParams = {
  params: {
    handId: string;
  };
};

export async function GET(request: Request, { params }: RouteParams) {
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

export async function PUT(request: Request, { params }: RouteParams) {
  const { handId } = params;
  try {
    const { textHistory } = await request.json();

    if (typeof textHistory !== 'string') {
      return NextResponse.json({ message: 'textHistory is required and must be a string' }, { status: 400 });
    }

    const allHands = await getHands();
    const handIndex = allHands.findIndex((h) => h.id === handId);

    if (handIndex === -1) {
      return NextResponse.json({ message: 'Hand not found' }, { status: 404 });
    }

    const updatedHand: Hand = {
      ...allHands[handIndex],
      textHistory,
      status: 'completed',
    };

    allHands[handIndex] = updatedHand;
    await saveHands(allHands);

    return NextResponse.json(updatedHand);
  } catch (error) {
    console.error('Failed to update hand:', error);
    return NextResponse.json({ message: 'Failed to update hand data' }, { status: 500 });
  }
}
