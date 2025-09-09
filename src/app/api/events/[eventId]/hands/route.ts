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
    const eventHands = await prisma.hand.findMany({
      where: {
        eventId: eventId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ hands: eventHands });
  } catch (error) {
    console.error(`Failed to get hands for event ${eventId}:`, error);
    return NextResponse.json({ message: 'Failed to read hands data' }, { status: 500 });
  }
}
