"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type TournamentEvent = {
  id: string;
  name: string;
};

// Full type for a hand, matching the backend
type Hand = {
  id: string;
  eventId: string;
  filename: string;
  path: string;
  status: 'uploaded' | 'processing' | 'needs_review' | 'completed';
};

export default function EventDetailPage() {
  const [event, setEvent] = useState<TournamentEvent | null>(null);
  const [hands, setHands] = useState<Hand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const eventId = params.eventId as string;

  useEffect(() => {
    if (!eventId) return;

    const fetchEventDetails = async () => {
      try {
        // Fetch event details
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) {
          throw new Error('Failed to fetch event details');
        }
        const eventData = await eventRes.json();
        setEvent(eventData);

        // Fetch hands for the event
        const handsRes = await fetch(`/api/events/${eventId}/hands`);
        if (!handsRes.ok) {
          throw new Error('Failed to fetch hands');
        }
        const handsData = await handsRes.json();
        setHands(handsData.hands);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/events/${eventId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('File upload failed');
      }

      const newHand = await res.json();
      setHands((prevHands) => [...prevHands, newHand]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during upload');
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  if (isLoading) {
    return <main className="container mx-auto px-4 py-8">Loading...</main>;
  }

  if (error) {
    return <main className="container mx-auto px-4 py-8 text-red-500">{error}</main>;
  }

  if (!event) {
    return <main className="container mx-auto px-4 py-8">Event not found.</main>;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/events" className="text-blue-500 hover:underline">&larr; Back to Events</Link>
      </div>
      <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
      <p className="text-sm text-gray-500 mb-8">Event ID: {event.id}</p>

      <div className="mb-8 p-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Upload Hand Video</h2>
        <form>
          <input
            type="file"
            onChange={handleFileUpload}
            accept="video/mp4,video/mov"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            disabled={isUploading}
          />
        </form>
        {isUploading && <p className="mt-2 text-sm text-gray-600">Uploading...</p>}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Uploaded Hands</h2>
        {hands.length > 0 ? (
          <ul className="space-y-4">
            {hands.map((hand) => (
              <li key={hand.id}>
                <Link href={`/events/${eventId}/hands/${hand.id}`} className="block p-4 bg-white shadow rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{hand.filename}</span>
                    <span className="text-sm capitalize px-2 py-1 bg-gray-200 rounded-full">{hand.status}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No hands uploaded for this event yet.</p>
        )}
      </div>
    </main>
  );
}
