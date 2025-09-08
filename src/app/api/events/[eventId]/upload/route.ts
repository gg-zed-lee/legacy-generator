import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

type Hand = {
  id: string;
  eventId: string;
  filename: string;
  path: string;
  status: 'uploaded' | 'processing' | 'needs_review' | 'completed';
};

const handsDbPath = path.join(process.cwd(), 'data', 'hands.db.json');
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

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

type PostParams = {
  params: {
    eventId: string;
  };
};

export async function POST(request: Request, { params }: PostParams) {
  const { eventId } = params;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const eventUploadsDir = path.join(uploadsDir, eventId);
    await fs.mkdir(eventUploadsDir, { recursive: true });

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safeFilename) {
        return NextResponse.json({ message: 'Invalid filename' }, { status: 400 });
    }
    const filePath = path.join(eventUploadsDir, safeFilename);
    const fileUrl = `/uploads/${eventId}/${safeFilename}`;

    // Save the file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Save hand metadata
    const hands = await getHands();
    const newHand: Hand = {
      id: randomUUID(),
      eventId,
      filename: safeFilename,
      path: fileUrl,
      status: 'uploaded',
    };
    hands.push(newHand);
    await saveHands(hands);

    return NextResponse.json(newHand, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ message: 'File upload failed' }, { status: 500 });
  }
}
