import { useDataset } from '../../context/DatasetContext';

export function Header() {
  const { datasetId } = useDataset();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
            Bitcoin Forensic Intelligence
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {datasetId && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500">Dataset:</span>
              <span className="font-mono text-xs text-gray-900 truncate max-w-[150px]">
                {datasetId.slice(0, 20)}...
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="API Documentation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM15.5 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 12a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM14.5 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 18.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM19.5 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 13a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM15.5 18a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </a>

            <a
              href="https://github.com/Abhishek240514/sih"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="GitHub Repository"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}