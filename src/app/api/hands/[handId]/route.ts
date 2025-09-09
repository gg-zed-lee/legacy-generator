import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// NOTE: This code is written assuming a functional Prisma Client.
// It will not run in the current sandbox environment due to `prisma migrate` failures.

type RouteParams = {
  params: {
    handId: string;
  };
};

export async function GET(request: Request, { params }: RouteParams) {
  const { handId } = params;
  try {
    const hand = await prisma.hand.findUnique({
      where: { id: handId },
    });

    if (!hand) {
      return NextResponse.json({ message: 'Hand not found' }, { status: 404 });
    }

    return NextResponse.json(hand);
  } catch (error) {
    console.error(`Failed to get hand ${handId}:`, error);
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

    const updatedHand = await prisma.hand.update({
      where: { id: handId },
      data: {
        textHistory: textHistory,
        status: 'COMPLETED',
      },
    });

    return NextResponse.json(updatedHand);
  } catch (error) {
    console.error(`Failed to update hand ${handId}:`, error);
    return NextResponse.json({ message: 'Failed to update hand data' }, { status: 500 });
  }
}
