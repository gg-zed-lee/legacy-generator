import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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

// (The mock data generation function is removed as it's being replaced)


type PostParams = {
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

export async function POST(request: Request, { params }: PostParams) {
  const { handId } = params;
  try {
    const allHands = await getHands();
    const handIndex = allHands.findIndex((h) => h.id === handId);

    if (handIndex === -1) {
      return NextResponse.json({ message: 'Hand not found' }, { status: 404 });
    }

    const hand = allHands[handIndex];

    // Convert URL path to filesystem path
    // e.g., /uploads/event-id/video.mp4 -> public/uploads/event-id/video.mp4
    const videoPath = path.join(process.cwd(), 'public', hand.path);

    // Mark hand as 'processing'
    hand.status = 'processing';
    await saveHands(allHands);

    const analysisResult = await runPythonScript(videoPath);

    const updatedHand = {
      ...hand,
      status: 'needs_review' as const,
      textHistory: analysisResult.raw_text,
      guiData: analysisResult.parsed_data,
    };

    allHands[handIndex] = updatedHand;
    await saveHands(allHands);

    return NextResponse.json(updatedHand);

  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json({ message: 'Analysis failed' }, { status: 500 });
  }
}
