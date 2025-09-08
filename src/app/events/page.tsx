"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TournamentEvent = {
  id: string;
  name: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch events from the API
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await res.json();
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEventName }),
      });

      if (!res.ok) {
        throw new Error('Failed to create event');
      }

      const newEvent = await res.json();
      setEvents([...events, newEvent]);
      setNewEventName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Event Management</h1>

      <div className="mb-8 p-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Create New Event</h2>
        <form onSubmit={handleCreateEvent} className="flex gap-4">
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Enter event name"
            className="flex-grow p-2 border rounded"
          />
          <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            Create
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Existing Events</h2>
        {isLoading && <p>Loading events...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && !error && (
          <ul className="space-y-4">
            {events.length > 0 ? (
              events.map((event) => (
                <li key={event.id}>
                  <Link href={`/events/${event.id}`} className="block p-4 bg-white shadow rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="font-medium">{event.name}</span>
                  </Link>
                </li>
              ))
            ) : (
              <p>No events found. Create one to get started!</p>
            )}
          </ul>
        )}
      </div>
    </main>
  );
}
