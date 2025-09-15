import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// VS Code API types
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface ScanResult {
  filePath: string;
  lineNumber: number;
  endpointType: string;
  confidence: number;
  language: string;
  matchedPattern: string;
  context: string;
}

interface ScanPanelState {
  isScanning: boolean;
  scanResults: ScanResult[];
  totalFiles: number;
  scannedFiles: number;
  progress: number;
  filters: {
    language?: string;
    endpoint?: string;
    confidence?: number;
  };
}

interface ProgressData {
  scannedFiles: number;
  totalFiles: number;
  progress: number;
}

const ScanPanel: React.FC = () => {
  const [state, setState] = useState<ScanPanelState>({
    isScanning: false,
    scanResults: [],
    totalFiles: 0,
    scannedFiles: 0,
    progress: 0,
    filters: {}
  });

  const [filteredResults, setFilteredResults] = useState<ScanResult[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);

  const vscode = acquireVsCodeApi();

  // Handle messages from extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'updateState':
          setState(message.data);
          break;
        case 'updateResults':
          setState(prev => ({ ...prev, scanResults: message.data }));
          break;
        case 'progressUpdate':
          const progressData: ProgressData = message.data;
          setState(prev => ({
            ...prev,
            scannedFiles: progressData.scannedFiles,
            totalFiles: progressData.totalFiles,
            progress: progressData.progress
          }));
          break;
        case 'updateFilters':
          setState(prev => ({ ...prev, filters: message.data }));
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);

  // Filter results based on current filters
  useEffect(() => {
    let filtered = state.scanResults;

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(result => result.language === selectedLanguage);
    }

    if (selectedEndpoint !== 'all') {
      filtered = filtered.filter(result => result.endpointType === selectedEndpoint);
    }

    if (minConfidence > 0) {
      filtered = filtered.filter(result => result.confidence >= minConfidence);
    }

    setFilteredResults(filtered);
  }, [state.scanResults, selectedLanguage, selectedEndpoint, minConfidence]);

  const handleStartScan = useCallback(() => {
    vscode.postMessage({ type: 'startScan' });
  }, [vscode]);

  const handleStopScan = useCallback(() => {
    vscode.postMessage({ type: 'stopScan' });
  }, [vscode]);

  const handleRefreshScan = useCallback(() => {
    vscode.postMessage({ type: 'refreshScan' });
  }, [vscode]);

  const handleOpenFile = useCallback((filePath: string, lineNumber: number) => {
    vscode.postMessage({ 
      type: 'openFile', 
      data: { filePath, lineNumber } 
    });
  }, [vscode]);

  const handleFilterChange = useCallback(() => {
    vscode.postMessage({
      type: 'filterResults',
      data: {
        language: selectedLanguage,
        endpoint: selectedEndpoint,
        confidence: minConfidence
      }
    });
  }, [vscode, selectedLanguage, selectedEndpoint, minConfidence]);

  // Get unique languages and endpoints for filters
  const uniqueLanguages = Array.from(new Set(state.scanResults.map(r => r.language)));
  const uniqueEndpoints = Array.from(new Set(state.scanResults.map(r => r.endpointType)));

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'var(--vscode-charts-green)';
    if (confidence >= 0.6) return 'var(--vscode-charts-yellow)';
    return 'var(--vscode-charts-red)';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const formatFilePath = (filePath: string): string => {
    const parts = filePath.split(/[\\/]/);
    return parts.length > 3 ? `.../${parts.slice(-3).join('/')}` : filePath;
  };

  return (
    <div className=\"scan-panel\">
      <div className=\"scan-header\">
        <h2>Converge Endpoint Scanner</h2>
        <div className=\"scan-controls\">
          {!state.isScanning ? (
            <>
              <button 
                className=\"scan-button primary\" 
                onClick={handleStartScan}
                title=\"Start scanning workspace for Converge endpoints\"
              >
                <span className=\"codicon codicon-search\"></span>
                Start Scan
              </button>
              <button 
                className=\"scan-button secondary\" 
                onClick={handleRefreshScan}
                disabled={state.scanResults.length === 0}
                title=\"Refresh scan results\"
              >
                <span className=\"codicon codicon-refresh\"></span>
                Refresh
              </button>
            </>
          ) : (
            <button 
              className=\"scan-button danger\" 
              onClick={handleStopScan}
              title=\"Stop current scan\"
            >
              <span className=\"codicon codicon-stop\"></span>
              Stop Scan
            </button>
          )}
        </div>
      </div>

      {state.isScanning && (
        <div className=\"scan-progress\">
          <div className=\"progress-info\">
            <span>Scanning files... {state.scannedFiles} / {state.totalFiles}</span>
            <span>{Math.round(state.progress)}%</span>
          </div>
          <div className=\"progress-bar\">
            <div 
              className=\"progress-fill\" 
              style={{ width: `${state.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {state.scanResults.length > 0 && (
        <>
          <div className=\"scan-filters\">
            <div className=\"filter-group\">
              <label htmlFor=\"language-filter\">Language:</label>
              <select 
                id=\"language-filter\"
                value={selectedLanguage} 
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value=\"all\">All Languages</option>
                {uniqueLanguages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className=\"filter-group\">
              <label htmlFor=\"endpoint-filter\">Endpoint:</label>
              <select 
                id=\"endpoint-filter\"
                value={selectedEndpoint} 
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              >
                <option value=\"all\">All Endpoints</option>
                {uniqueEndpoints.map(endpoint => (
                  <option key={endpoint} value={endpoint}>{endpoint}</option>
                ))}
              </select>
            </div>

            <div className=\"filter-group\">
              <label htmlFor=\"confidence-filter\">Min Confidence:</label>
              <input 
                id=\"confidence-filter\"
                type=\"range\" 
                min=\"0\" 
                max=\"1\" 
                step=\"0.1\" 
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              />
              <span className=\"confidence-value\">{Math.round(minConfidence * 100)}%</span>
            </div>
          </div>

          <div className=\"scan-summary\">
            <div className=\"summary-item\">
              <span className=\"summary-label\">Total Results:</span>
              <span className=\"summary-value\">{state.scanResults.length}</span>
            </div>
            <div className=\"summary-item\">
              <span className=\"summary-label\">Filtered Results:</span>
              <span className=\"summary-value\">{filteredResults.length}</span>
            </div>
            <div className=\"summary-item\">
              <span className=\"summary-label\">Languages:</span>
              <span className=\"summary-value\">{uniqueLanguages.length}</span>
            </div>
          </div>

          <div className=\"scan-results\">
            {filteredResults.length === 0 ? (
              <div className=\"no-results\">
                <span className=\"codicon codicon-info\"></span>
                No results match the current filters
              </div>
            ) : (
              filteredResults.map((result, index) => (
                <div 
                  key={index} 
                  className=\"result-item\"
                  onClick={() => handleOpenFile(result.filePath, result.lineNumber)}
                >
                  <div className=\"result-header\">
                    <div className=\"result-file\">
                      <span className=\"codicon codicon-file-code\"></span>
                      <span className=\"file-path\" title={result.filePath}>
                        {formatFilePath(result.filePath)}
                      </span>
                      <span className=\"line-number\">:{result.lineNumber}</span>
                    </div>
                    <div className=\"result-badges\">
                      <span className=\"language-badge\">{result.language}</span>
                      <span 
                        className=\"confidence-badge\"
                        style={{ color: getConfidenceColor(result.confidence) }}
                      >
                        {getConfidenceText(result.confidence)}
                      </span>
                    </div>
                  </div>
                  
                  <div className=\"result-details\">
                    <div className=\"endpoint-type\">
                      <span className=\"codicon codicon-globe\"></span>
                      {result.endpointType}
                    </div>
                    <div className=\"pattern-match\">
                      <span className=\"codicon codicon-regex\"></span>
                      {result.matchedPattern}
                    </div>
                  </div>

                  {result.context && (
                    <div className=\"result-context\">
                      <code>{result.context}</code>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {!state.isScanning && state.scanResults.length === 0 && (
        <div className=\"empty-state\">
          <div className=\"empty-icon\">
            <span className=\"codicon codicon-search\"></span>
          </div>
          <h3>No Converge Endpoints Found</h3>
          <p>Click \"Start Scan\" to search your workspace for Converge payment endpoints.</p>
          <ul className=\"scan-info\">
            <li>Scans JavaScript, TypeScript, PHP, Python, Java, C#, and Ruby files</li>
            <li>Detects Converge API endpoints and SSL field usage</li>
            <li>Provides confidence scoring for each match</li>
            <li>Click on results to navigate to the code</li>
          </ul>
        </div>
      )}
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ScanPanel />);
}