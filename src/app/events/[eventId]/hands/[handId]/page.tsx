"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Hand = {
  id: string;
  eventId: string;
  filename: string;
  path: string;
  status: 'uploaded' | 'processing' | 'needs_review' | 'completed';
};

export default function HandReviewPage() {
  const [hand, setHand] = useState<Hand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const eventId = params.eventId as string;
  const handId = params.handId as string;

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
      <div className="flex-shrink-0 pb-4">
        <Link href={`/events/${eventId}`} className="text-blue-500 hover:underline">&larr; Back to Event</Link>
        <h1 className="text-2xl font-bold mt-2">Reviewing Hand: {hand.filename}</h1>
      </div>

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
        <div className="col-span-1 row-span-1 bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Visual Replay (GUI)</h2>
          <div className="flex items-center justify-center h-full bg-gray-50 rounded">
            <p className="text-gray-500">[GUI Placeholder]</p>
          </div>
        </div>

        {/* Bottom-Right Panel: Text History */}
        <div className="col-span-1 row-span-1 bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Text Hand History</h2>
          <div className="flex items-center justify-center h-full bg-gray-50 rounded">
            <p className="text-gray-500">[Text Editor Placeholder]</p>
          </div>
        </div>
      </div>
    </main>
  );
}
