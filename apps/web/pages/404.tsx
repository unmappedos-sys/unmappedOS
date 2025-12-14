import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | Unmapped OS</title>
      </Head>

      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-6xl font-mono text-cyan-400">404</h1>
            <h2 className="text-2xl font-mono text-gray-400">LOCATION UNMAPPED</h2>
          </div>

          <p className="text-gray-500 font-mono text-sm">
            THE REQUESTED COORDINATES DO NOT EXIST IN THE DATABASE
          </p>

          <div className="pt-4">
            <Link
              href="/"
              className="inline-block bg-cyan-500 text-black px-6 py-3 font-mono hover:bg-cyan-400 transition-colors"
            >
              RETURN TO BASE
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
