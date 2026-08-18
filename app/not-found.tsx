import Link from "next/link";

/**
 * ECHO — Custom 404 Page ( app/not-found.tsx )
 * Aesthetics: Utilitarian Canvas — pure black, stark monospace, 1px border.
 */

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-mono">
      <div className="space-y-8 max-w-md w-full border border-neutral-900 p-8 md:p-12">
        <div className="space-y-2">
          <p className="text-xs text-neutral-600 tracking-[0.3em] uppercase">
            // SIGNAL LOST
          </p>
          <h1 className="text-sm md:text-base tracking-[0.25em] text-white font-bold uppercase">
            [ 404 // FREQUENCY NOT FOUND ]
          </h1>
        </div>

        <p className="font-mono text-neutral-400 text-xs leading-relaxed uppercase tracking-wider">
          The requested audio frequency does not exist or has been purged from the network.
        </p>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-block w-full py-4 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-colors duration-150 cursor-pointer"
          >
            [ RETURN TO STREAM ]
          </Link>
        </div>
      </div>
    </div>
  );
}
