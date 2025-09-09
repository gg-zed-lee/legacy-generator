import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

// NOTE: This code is written assuming a functional Prisma Client.
// It will not run in the current sandbox environment due to `prisma migrate` failures.

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

type RouteParams = {
  params: {
    eventId: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
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

    // Save hand metadata to the database
    const newHand = await prisma.hand.create({
      data: {
        eventId: eventId,
        filename: safeFilename,
        path: fileUrl,
        status: 'UPLOADED',
      },
    });

    return NextResponse.json(newHand, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ message: 'File upload failed' }, { status: 500 });
  }
}
