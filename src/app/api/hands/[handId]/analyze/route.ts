import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// This is a simplified version of the JSON data structure from the TRD
// In a real scenario, this would be much more detailed.
type GuiData = {
  handId: string;
  tournamentInfo: {
    name: string;
    blinds: string;
    ante: number;
  };
  players: { seat: number; name: string; stack: number; cards: string[] }[];
  actions: { street: string; player: string; action: string; amount?: number }[];
  board: string[];
  result: { winner: string; pot: number; winningHand: string };
};

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

// Function to generate mock data based on the TRD examples
function generateMockData(handId: string): { textHistory: string; guiData: GuiData } {
  const guiData: GuiData = {
    handId: handId,
    tournamentInfo: {
      name: 'Mock Sunday Main Event',
      blinds: '1000/2000',
      ante: 200,
    },
    players: [
      { seat: 1, name: 'PlayerA', stack: 100000, cards: ['As', 'Kd'] },
      { seat: 5, name: 'PlayerB', stack: 85000, cards: ['7h', '7s'] },
    ],
    actions: [
      { street: 'preflop', player: 'PlayerA', action: 'raise', amount: 4000 },
      { street: 'preflop', player: 'PlayerB', action: 'call', amount: 4000 },
      { street: 'flop', player: 'PlayerA', action: 'bet', amount: 6000 },
      { street: 'flop', player: 'PlayerB', action: 'call', amount: 6000 },
      { street: 'turn', player: 'PlayerA', action: 'check' },
      { street: 'turn', player: 'PlayerB', action: 'check' },
      { street: 'river', player: 'PlayerA', action: 'bet', amount: 15000 },
      { street: 'river', player: 'PlayerB', action: 'fold' },
    ],
    board: ['2c', '5h', '8d', 'Jc', '4s'],
    result: {
      winner: 'PlayerA',
      pot: 21200,
      winningHand: 'High Card: Ace',
    },
  };

  const textHistory = `***** Hand History for Game #${handId} *****
Tournament: Mock Sunday Main Event
Blinds: 1000/2000 Ante 200
Table: Final Table (9-max)
Seat 1: PlayerA (50 BB)
Seat 5: PlayerB (42.5 BB)
** PRE-FLOP **
PlayerA (UTG) raises to 4000.
PlayerB (CO) calls 4000.
** FLOP ** [2c 5h 8d]
PlayerA bets 6000.
PlayerB calls 6000.
** TURN ** [2c 5h 8d] [Jc]
PlayerA checks.
PlayerB checks.
** RIVER ** [2c 5h 8d Jc] [4s]
PlayerA bets 15000.
PlayerB folds.
** SUMMARY **
Total pot: 21200 | Rake: 0
Winner: PlayerA wins 21200`;

  return { textHistory, guiData };
}


type PostParams = {
  params: {
    handId: string;
  };
};

export async function POST(request: Request, { params }: PostParams) {
  const { handId } = params;
  try {
    const allHands = await getHands();
    const handIndex = allHands.findIndex((h) => h.id === handId);

    if (handIndex === -1) {
      return NextResponse.json({ message: 'Hand not found' }, { status: 404 });
    }

    // Simulate a delay for AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { textHistory, guiData } = generateMockData(handId);

    const updatedHand = {
      ...allHands[handIndex],
      status: 'needs_review' as const,
      textHistory,
      guiData,
    };

    allHands[handIndex] = updatedHand;
    await saveHands(allHands);

    return NextResponse.json(updatedHand);

  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json({ message: 'Analysis failed' }, { status: 500 });
  }
}
