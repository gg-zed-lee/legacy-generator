import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          Poker Hand History AI Agent
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Automate hand history creation from tournament videos.
        </p>
        <Link href="/events" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
          Get Started
        </Link>
      </div>
    </main>
  );
}
