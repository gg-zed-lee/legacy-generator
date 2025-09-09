import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// NOTE: This code is written assuming a functional Prisma Client.
// It will not run in the current sandbox environment due to `prisma migrate` failures.

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json({ message: 'Failed to fetch events.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'Event name is required.' }, { status: 400 });
    }

    const newEvent = await prisma.event.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json({ message: 'Failed to create event.' }, { status: 500 });
  }
}
