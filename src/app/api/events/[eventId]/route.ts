import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// NOTE: This code is written assuming a functional Prisma Client.
// It will not run in the current sandbox environment due to `prisma migrate` failures.

type RouteParams = {
  params: {
    eventId: string;
  };
};

export async function GET(request: Request, { params }: RouteParams) {
  const { eventId } = params;
  try {
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error(`Failed to fetch event ${eventId}:`, error);
    return NextResponse.json({ message: 'Failed to read event data' }, { status: 500 });
  }
}
