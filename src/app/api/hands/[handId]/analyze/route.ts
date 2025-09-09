import { NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';
import { prisma } from '@/lib/prisma';

// This type matches the output of our refined Python parser
type ParsedData = {
  tournamentInfo: { name: string; blinds: string; ante: number };
  players: { seat: number; name: string; stack: number; cards: string[] }[];
  actions: { street: string; player: string; action: string; amount?: number }[];
  board: string[];
  result: { winner: string; pot: number; winningHand: string };
};

type PythonOutput = {
  raw_text: string;
  parsed_data: ParsedData;
}

type GuiData = ParsedData;

// (The Hand type is now defined by Prisma, so it's not needed here)

// NOTE: This code is written assuming a functional Prisma Client.
// It will not run in the current sandbox environment due to `prisma migrate` failures.

type RouteParams = {
  params: {
    handId: string;
  };
};

async function runPythonScript(videoPath: string): Promise<PythonOutput> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['scripts/process_video.py', videoPath]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(stderr);
        reject(new Error(`Analysis script failed: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          console.error("Failed to parse Python script output as JSON:", stdout);
          reject(new Error("Failed to parse Python script output."));
        }
      }
    });
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { handId } = params;
  try {
    const hand = await prisma.hand.findUnique({ where: { id: handId } });

    if (!hand) {
      return NextResponse.json({ message: 'Hand not found' }, { status: 404 });
    }

    // Convert URL path to filesystem path
    const videoPath = path.join(process.cwd(), 'public', hand.path);

    // Mark hand as 'processing'
    await prisma.hand.update({
      where: { id: handId },
      data: { status: 'PROCESSING' },
    });

    const analysisResult = await runPythonScript(videoPath);

    // Save the results to the database
    const updatedHand = await prisma.hand.update({
      where: { id: handId },
      data: {
        status: 'NEEDS_REVIEW',
        textHistory: analysisResult.raw_text,
        // The `guiData` field in Prisma is of type Json.
        // Prisma expects a value that can be serialized to JSON.
        guiData: analysisResult.parsed_data as any,
      },
    });

    return NextResponse.json(updatedHand);

  } catch (error) {
    // If something fails, mark the hand as 'UPLOADED' again
    await prisma.hand.update({
      where: { id: handId },
      data: { status: 'UPLOADED' },
    });
    console.error('Analysis failed:', error);
    return NextResponse.json({ message: 'Analysis failed' }, { status: 500 });
  }
}
