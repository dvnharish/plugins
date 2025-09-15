// Compiled React component for VS Code webview
(function() {
  'use strict';

  // Simple React-like implementation for VS Code webview
  const vscode = acquireVsCodeApi();
  
  let currentState = {
    isScanning: false,
    scanResults: [],
    totalFiles: 0,
    scannedFiles: 0,
    progress: 0,
    filters: {}
  };

  let filteredResults = [];
  let selectedLanguage = 'all';
  let selectedEndpoint = 'all';
  let minConfidence = 0;

  // DOM elements
  let rootElement;
  
  // Initialize the application
  function init() {
    rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element not found');
      return;
    }

    // Listen for messages from extension
    window.addEventListener('message', handleMessage);
    
    // Render initial UI
    render();
  }

  function handleMessage(event) {
    const message = event.data;
    
    switch (message.type) {
      case 'updateState':
        currentState = { ...currentState, ...message.data };
        render();
        break;
      case 'updateResults':
        currentState.scanResults = message.data;
        filterResults();
        render();
        break;
      case 'progressUpdate':
        currentState = {
          ...currentState,
          scannedFiles: message.data.scannedFiles,
          totalFiles: message.data.totalFiles,
          progress: message.data.progress
        };
        render();
        break;
      case 'updateFilters':
        currentState.filters = message.data;
        render();
        break;
    }
  }

  function filterResults() {
    filteredResults = currentState.scanResults.filter(result => {
      if (selectedLanguage !== 'all' && result.language !== selectedLanguage) {
        return false;
      }
      if (selectedEndpoint !== 'all' && result.endpointType !== selectedEndpoint) {
        return false;
      }
      if (result.confidence < minConfidence) {
        return false;
      }
      return true;
    });
  }

  function handleStartScan() {
    vscode.postMessage({ type: 'startScan' });
  }

  function handleStopScan() {
    vscode.postMessage({ type: 'stopScan' });
  }

  function handleRefreshScan() {
    vscode.postMessage({ type: 'refreshScan' });
  }

  function handleOpenFile(filePath, lineNumber) {
    vscode.postMessage({ 
      type: 'openFile', 
      data: { filePath, lineNumber } 
    });
  }

  function handleLanguageChange(event) {
    selectedLanguage = event.target.value;
    filterResults();
    render();
  }

  function handleEndpointChange(event) {
    selectedEndpoint = event.target.value;
    filterResults();
    render();
  }

  function handleConfidenceChange(event) {
    minConfidence = parseFloat(event.target.value);
    filterResults();
    render();
  }

  function getConfidenceColor(confidence) {
    if (confidence >= 0.8) return 'var(--vscode-charts-green)';
    if (confidence >= 0.6) return 'var(--vscode-charts-yellow)';
    return 'var(--vscode-charts-red)';
  }

  function getConfidenceText(confidence) {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  }

  function formatFilePath(filePath) {
    const parts = filePath.split(/[\\\\/]/);
    return parts.length > 3 ? `.../${parts.slice(-3).join('/')}` : filePath;
  }

  function getUniqueLanguages() {
    return [...new Set(currentState.scanResults.map(r => r.language))];
  }

  function getUniqueEndpoints() {
    return [...new Set(currentState.scanResults.map(r => r.endpointType))];
  }

  function createElement(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'onClick') {
        element.addEventListener('click', value);
      } else if (key === 'onChange') {
        element.addEventListener('change', value);
      } else if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });

    return element;
  }

  function renderHeader() {
    const controls = createElement('div', { className: 'scan-controls' });
    
    if (!currentState.isScanning) {
      const startButton = createElement('button', {
        className: 'scan-button primary',
        onClick: handleStartScan,
        title: 'Start scanning workspace for Converge endpoints'
      });
      startButton.innerHTML = '<span class=\"codicon codicon-search\"></span>Start Scan';
      
      const refreshButton = createElement('button', {
        className: 'scan-button secondary',
        onClick: handleRefreshScan,
        disabled: currentState.scanResults.length === 0,
        title: 'Refresh scan results'
      });
      refreshButton.innerHTML = '<span class=\"codicon codicon-refresh\"></span>Refresh';
      
      controls.appendChild(startButton);
      controls.appendChild(refreshButton);
    } else {
      const stopButton = createElement('button', {
        className: 'scan-button danger',
        onClick: handleStopScan,
        title: 'Stop current scan'
      });
      stopButton.innerHTML = '<span class=\"codicon codicon-stop\"></span>Stop Scan';
      controls.appendChild(stopButton);
    }

    return createElement('div', { className: 'scan-header' },
      createElement('h2', {}, 'Converge Endpoint Scanner'),
      controls
    );
  }

  function renderProgress() {
    if (!currentState.isScanning) return null;

    const progressInfo = createElement('div', { className: 'progress-info' },
      createElement('span', {}, `Scanning files... ${currentState.scannedFiles} / ${currentState.totalFiles}`),
      createElement('span', {}, `${Math.round(currentState.progress)}%`)
    );

    const progressFill = createElement('div', { 
      className: 'progress-fill',
      style: { width: `${currentState.progress}%` }
    });

    const progressBar = createElement('div', { className: 'progress-bar' }, progressFill);

    return createElement('div', { className: 'scan-progress' }, progressInfo, progressBar);
  }

  function renderFilters() {
    if (currentState.scanResults.length === 0) return null;

    const uniqueLanguages = getUniqueLanguages();
    const uniqueEndpoints = getUniqueEndpoints();

    const languageSelect = createElement('select', {
      id: 'language-filter',
      value: selectedLanguage,
      onChange: handleLanguageChange
    });
    languageSelect.appendChild(createElement('option', { value: 'all' }, 'All Languages'));
    uniqueLanguages.forEach(lang => {
      languageSelect.appendChild(createElement('option', { value: lang }, lang));
    });

    const endpointSelect = createElement('select', {
      id: 'endpoint-filter',
      value: selectedEndpoint,
      onChange: handleEndpointChange
    });
    endpointSelect.appendChild(createElement('option', { value: 'all' }, 'All Endpoints'));
    uniqueEndpoints.forEach(endpoint => {
      endpointSelect.appendChild(createElement('option', { value: endpoint }, endpoint));
    });

    const confidenceInput = createElement('input', {
      id: 'confidence-filter',
      type: 'range',
      min: '0',
      max: '1',
      step: '0.1',
      value: minConfidence.toString(),
      onChange: handleConfidenceChange
    });

    return createElement('div', { className: 'scan-filters' },
      createElement('div', { className: 'filter-group' },
        createElement('label', { htmlFor: 'language-filter' }, 'Language:'),
        languageSelect
      ),
      createElement('div', { className: 'filter-group' },
        createElement('label', { htmlFor: 'endpoint-filter' }, 'Endpoint:'),
        endpointSelect
      ),
      createElement('div', { className: 'filter-group' },
        createElement('label', { htmlFor: 'confidence-filter' }, 'Min Confidence:'),
        confidenceInput,
        createElement('span', { className: 'confidence-value' }, `${Math.round(minConfidence * 100)}%`)
      )
    );
  }

  function renderSummary() {
    if (currentState.scanResults.length === 0) return null;

    return createElement('div', { className: 'scan-summary' },
      createElement('div', { className: 'summary-item' },
        createElement('span', { className: 'summary-label' }, 'Total Results:'),
        createElement('span', { className: 'summary-value' }, currentState.scanResults.length.toString())
      ),
      createElement('div', { className: 'summary-item' },
        createElement('span', { className: 'summary-label' }, 'Filtered Results:'),
        createElement('span', { className: 'summary-value' }, filteredResults.length.toString())
      ),
      createElement('div', { className: 'summary-item' },
        createElement('span', { className: 'summary-label' }, 'Languages:'),
        createElement('span', { className: 'summary-value' }, getUniqueLanguages().length.toString())
      )
    );
  }

  function renderResults() {
    if (currentState.scanResults.length === 0) {
      return renderEmptyState();
    }

    if (filteredResults.length === 0) {
      return createElement('div', { className: 'no-results' },
        createElement('span', { className: 'codicon codicon-info' }),
        'No results match the current filters'
      );
    }

    const resultsContainer = createElement('div', { className: 'scan-results' });
    
    filteredResults.forEach((result, index) => {
      const resultItem = createElement('div', {
        className: 'result-item',
        onClick: () => handleOpenFile(result.filePath, result.lineNumber)
      });

      const resultHeader = createElement('div', { className: 'result-header' },
        createElement('div', { className: 'result-file' },
          createElement('span', { className: 'codicon codicon-file-code' }),
          createElement('span', { 
            className: 'file-path',
            title: result.filePath
          }, formatFilePath(result.filePath)),
          createElement('span', { className: 'line-number' }, `:${result.lineNumber}`)
        ),
        createElement('div', { className: 'result-badges' },
          createElement('span', { className: 'language-badge' }, result.language),
          createElement('span', { 
            className: 'confidence-badge',
            style: { color: getConfidenceColor(result.confidence) }
          }, getConfidenceText(result.confidence))
        )
      );

      const resultDetails = createElement('div', { className: 'result-details' },
        createElement('div', { className: 'endpoint-type' },
          createElement('span', { className: 'codicon codicon-globe' }),
          result.endpointType
        ),
        createElement('div', { className: 'pattern-match' },
          createElement('span', { className: 'codicon codicon-regex' }),
          result.matchedPattern
        )
      );

      resultItem.appendChild(resultHeader);
      resultItem.appendChild(resultDetails);

      if (result.context) {
        const resultContext = createElement('div', { className: 'result-context' },
          createElement('code', {}, result.context)
        );
        resultItem.appendChild(resultContext);
      }

      resultsContainer.appendChild(resultItem);
    });

    return resultsContainer;
  }

  function renderEmptyState() {
    return createElement('div', { className: 'empty-state' },
      createElement('div', { className: 'empty-icon' },
        createElement('span', { className: 'codicon codicon-search' })
      ),
      createElement('h3', {}, 'No Converge Endpoints Found'),
      createElement('p', {}, 'Click \"Start Scan\" to search your workspace for Converge payment endpoints.'),
      createElement('ul', { className: 'scan-info' },
        createElement('li', {}, 'Scans JavaScript, TypeScript, PHP, Python, Java, C#, and Ruby files'),
        createElement('li', {}, 'Detects Converge API endpoints and SSL field usage'),
        createElement('li', {}, 'Provides confidence scoring for each match'),
        createElement('li', {}, 'Click on results to navigate to the code')
      )
    );
  }

  function render() {
    if (!rootElement) return;

    // Clear existing content
    rootElement.innerHTML = '';

    // Create main container
    const container = createElement('div', { className: 'scan-panel' });

    // Add components
    container.appendChild(renderHeader());
    
    const progress = renderProgress();
    if (progress) container.appendChild(progress);
    
    const filters = renderFilters();
    if (filters) container.appendChild(filters);
    
    const summary = renderSummary();
    if (summary) container.appendChild(summary);
    
    container.appendChild(renderResults());

    rootElement.appendChild(container);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();