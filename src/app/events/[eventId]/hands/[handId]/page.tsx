"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

type GuiData = {
  tournamentInfo: { name: string; blinds: string; ante: number };
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

export default function HandReviewPage() {
  const [hand, setHand] = useState<Hand | null>(null);
  const [editedText, setEditedText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const handId = params.handId as string;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hands/${handId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textHistory: editedText }),
      });
      if (!res.ok) {
        throw new Error('Failed to save hand history');
      }
      // On success, redirect back to the event page
      router.push(`/events/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while saving');
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!handId) return;

    const fetchHandDetails = async () => {
      try {
        const res = await fetch(`/api/hands/${handId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch hand details');
        }
        const data = await res.json();
        setHand(data);
        setEditedText(data.textHistory || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHandDetails();
  }, [handId]);

  if (isLoading) {
    return <main className="container mx-auto px-4 py-8">Loading hand...</main>;
  }

  if (error) {
    return <main className="container mx-auto px-4 py-8 text-red-500">{error}</main>;
  }

  if (!hand) {
    return <main className="container mx-auto px-4 py-8">Hand not found.</main>;
  }

  return (
    <main className="h-screen flex flex-col p-4 bg-gray-100">
      <div className="flex-shrink-0 pb-4 flex justify-between items-center">
        <div>
          <Link href={`/events/${eventId}`} className="text-blue-500 hover:underline">&larr; Back to Event</Link>
          <h1 className="text-2xl font-bold mt-2">Reviewing Hand: {hand.filename}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || hand.status === 'completed'}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSaving ? 'Saving...' : (hand.status === 'completed' ? 'Completed' : 'Confirm & Save')}
        </button>
      </div>

      {error && <p className="text-red-500 bg-red-100 p-2 rounded mb-4">{error}</p>}

      <div className="flex-grow grid grid-cols-3 grid-rows-2 gap-4">
        {/* Left Panel: Video Player */}
        <div className="col-span-2 row-span-2 bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Original Video</h2>
          <div className="w-full h-full bg-black rounded">
            <video src={hand.path} controls className="w-full h-full object-contain">
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Top-Right Panel: GUI Replay */}
        <div className="col-span-1 row-span-1 bg-white shadow rounded-lg p-4 flex flex-col">
          <h2 className="text-xl font-semibold mb-2 flex-shrink-0">Visual Replay (GUI)</h2>
          <div className="flex-grow bg-gray-50 rounded p-2 overflow-y-auto">
            {hand.guiData ? <GuiDisplay data={hand.guiData} /> : <p className="text-gray-500">No GUI data available.</p>}
          </div>
        </div>

        {/* Bottom-Right Panel: Text History */}
        <div className="col-span-1 row-span-1 bg-white shadow rounded-lg p-4 flex flex-col">
          <h2 className="text-xl font-semibold mb-2 flex-shrink-0">Text Hand History</h2>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full flex-grow bg-gray-50 rounded p-2 font-mono text-sm border disabled:bg-gray-200"
            placeholder="No text history available."
            disabled={hand.status === 'completed'}
          />
        </div>
      </div>
    </main>
  );
}

function GuiDisplay({ data }: { data: GuiData }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-bold">{data.tournamentInfo.name}</h3>
        <p>Blinds: {data.tournamentInfo.blinds} (Ante: {data.tournamentInfo.ante})</p>
        <p>Pot: {data.result.pot}</p>
      </div>
      <div>
        <h3 className="font-bold">Actions</h3>
        <ul className="space-y-1">
          {data.actions.map((action, index) => (
            <li key={index} className="font-mono text-xs">
              <span className="font-semibold">{action.street}:</span> {action.player} {action.action} {action.amount || ''}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-bold">Board</h3>
        <div className="flex space-x-2">
          {data.board.map(card => (
            <span key={card} className="px-2 py-1 bg-white border rounded shadow-sm">{card}</span>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold">Players</h3>
        <ul className="space-y-2">
          {data.players.map(player => (
            <li key={player.seat} className="flex justify-between">
              <span>{player.name} (Seat {player.seat})</span>
              <div className="flex space-x-1">
                {player.cards.map(card => (
                  <span key={card} className="px-2 py-1 bg-white border rounded shadow-sm">{card}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
       <div>
        <h3 className="font-bold">Winner</h3>
        <p>{data.result.winner} with {data.result.winningHand}</p>
      </div>
    </div>
  )
}
