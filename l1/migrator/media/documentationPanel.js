// Documentation Panel JavaScript for VS Code webview
(function() {
  'use strict';

  // VS Code API
  const vscode = acquireVsCodeApi();
  
  let currentState = {
    isLoading: false,
    searchResults: [],
    selectedMapping: null,
    mappingStats: null,
    searchQuery: '',
    activeTab: 'search'
  };

  let searchResults = [];
  let selectedMapping = null;

  // DOM elements
  let rootElement;
  let searchInput;
  let searchButton;
  let tabButtons;
  let contentArea;
  let loadingIndicator;
  
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
    
    // Load initial data
    vscode.postMessage({ type: 'loadMappingStats' });
  }

  function handleMessage(event) {
    const message = event.data;
    
    switch (message.type) {
      case 'updateState':
        currentState = { ...currentState, ...message.data };
        updateStateDisplay();
        break;
      case 'searchResults':
        handleSearchResults(message.data);
        break;
      case 'fieldMappingDetails':
        handleFieldMappingDetails(message.data);
        break;
      case 'endpointMappingDetails':
        handleEndpointMappingDetails(message.data);
        break;
      case 'mappingStats':
        handleMappingStats(message.data);
        break;
      case 'generatedCode':
        handleGeneratedCode(message.data);
        break;
      case 'searchError':
        handleSearchError(message.data);
        break;
      case 'mappingNotFound':
        handleMappingNotFound(message.data);
        break;
    }
  }

  function handleSearchResults(data) {
    searchResults = data.results;
    renderSearchResults();
    showNotification(`Found ${data.totalResults} results for "${data.query}"`, 'info');
  }

  function handleFieldMappingDetails(data) {
    selectedMapping = data.mapping;
    renderMappingDetails(data);
  }

  function handleEndpointMappingDetails(data) {
    selectedMapping = data.mapping;
    renderEndpointDetails(data);
  }

  function handleMappingStats(data) {
    currentState.mappingStats = data;
    if (currentState.activeTab === 'stats') {
      renderStatsTab();
    }
  }

  function handleGeneratedCode(data) {
    showCodeModal(data);
  }

  function handleSearchError(data) {
    showNotification(`Search failed: ${data.error}`, 'error');
  }

  function handleMappingNotFound(data) {
    showNotification(`${data.type} mapping not found: ${data.fieldName || data.endpointName}`, 'warning');
  }

  function updateStateDisplay() {
    if (loadingIndicator) {
      loadingIndicator.style.display = currentState.isLoading ? 'block' : 'none';
    }
  }

  function handleSearch() {
    const query = searchInput?.value.trim() || '';
    if (query) {
      vscode.postMessage({ 
        type: 'searchMappings', 
        data: { query } 
      });
    }
  }

  function handleTabChange(tabName) {
    currentState.activeTab = tabName;
    
    // Update tab buttons
    if (tabButtons) {
      tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
      });
    }
    
    // Render appropriate content
    switch (tabName) {
      case 'search':
        renderSearchTab();
        break;
      case 'browse':
        renderBrowseTab();
        break;
      case 'stats':
        renderStatsTab();
        break;
    }
  }

  function handleFieldClick(fieldName) {
    vscode.postMessage({ 
      type: 'getFieldMapping', 
      data: { fieldName } 
    });
  }

  function handleEndpointClick(endpointName) {
    vscode.postMessage({ 
      type: 'getEndpointMapping', 
      data: { endpointName } 
    });
  }

  function handleGenerateCode(fieldName, language) {
    vscode.postMessage({ 
      type: 'generateCode', 
      data: { fieldName, language } 
    });
  }

  function handleExport(format) {
    vscode.postMessage({ 
      type: 'exportMappings', 
      data: { format } 
    });
  }

  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="codicon codicon-${type === 'info' ? 'info' : type === 'error' ? 'error' : 'warning'}"></span>
      ${message}
    `;
    
    rootElement.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  function showCodeModal(data) {
    const modal = document.createElement('div');
    modal.className = 'code-modal';
    modal.innerHTML = `
      <div class="code-modal-content">
        <div class="code-modal-header">
          <h3>Generated Code: ${data.fieldName} (${data.language})</h3>
          <button class="close-button" onclick="this.closest('.code-modal').remove()">
            <span class="codicon codicon-close"></span>
          </button>
        </div>
        <div class="code-modal-body">
          <pre><code>${escapeHtml(data.code)}</code></pre>
        </div>
        <div class="code-modal-footer">
          <button onclick="navigator.clipboard.writeText('${escapeHtml(data.code)}')">
            <span class="codicon codicon-copy"></span>
            Copy to Clipboard
          </button>
        </div>
      </div>
    `;
    
    rootElement.appendChild(modal);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function createElement(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'onClick') {
        element.addEventListener('click', value);
      } else if (key === 'onChange') {
        element.addEventListener('change', value);
      } else if (key === 'onInput') {
        element.addEventListener('input', value);
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
    return createElement('div', { className: 'documentation-header' },
      createElement('h2', {}, 'Migration Documentation'),
      createElement('p', { className: 'header-description' }, 
        'Interactive mapping dictionary for Converge to Elavon migration'
      )
    );
  }

  function renderTabs() {
    const tabContainer = createElement('div', { className: 'tab-container' });
    
    const tabs = [
      { id: 'search', label: 'Search', icon: 'search' },
      { id: 'browse', label: 'Browse', icon: 'list-unordered' },
      { id: 'stats', label: 'Statistics', icon: 'graph' }
    ];

    tabButtons = tabs.map(tab => {
      const button = createElement('button', {
        className: `tab-button ${currentState.activeTab === tab.id ? 'active' : ''}`,
        'data-tab': tab.id,
        onClick: () => handleTabChange(tab.id)
      });
      button.innerHTML = `<span class="codicon codicon-${tab.icon}"></span>${tab.label}`;
      return button;
    });

    tabButtons.forEach(button => tabContainer.appendChild(button));
    return tabContainer;
  }

  function renderSearchTab() {
    const searchContainer = createElement('div', { className: 'search-container' });

    const searchForm = createElement('div', { className: 'search-form' },
      createElement('div', { className: 'search-input-group' },
        searchInput = createElement('input', {
          type: 'text',
          placeholder: 'Search fields, endpoints, or mappings...',
          value: currentState.searchQuery,
          onInput: (e) => {
            if (e.target.value.length > 2) {
              handleSearch();
            }
          }
        }),
        searchButton = createElement('button', {
          className: 'search-button',
          onClick: handleSearch
        })
      )
    );
    searchButton.innerHTML = '<span class="codicon codicon-search"></span>';

    searchContainer.appendChild(searchForm);
    
    const resultsContainer = createElement('div', { className: 'search-results' });
    searchContainer.appendChild(resultsContainer);

    contentArea.innerHTML = '';
    contentArea.appendChild(searchContainer);

    renderSearchResults();
  }

  function renderSearchResults() {
    const resultsContainer = contentArea.querySelector('.search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    if (searchResults.length === 0) {
      if (currentState.searchQuery) {
        resultsContainer.appendChild(
          createElement('div', { className: 'no-results' },
            createElement('span', { className: 'codicon codicon-search' }),
            `No results found for "${currentState.searchQuery}"`
          )
        );
      } else {
        resultsContainer.appendChild(
          createElement('div', { className: 'search-help' },
            createElement('h3', {}, 'Search Tips'),
            createElement('ul', {},
              createElement('li', {}, 'Search for field names like "ssl_merchant_id"'),
              createElement('li', {}, 'Search for endpoints like "hosted-payments"'),
              createElement('li', {}, 'Use partial matches like "card" or "payment"'),
              createElement('li', {}, 'Results are sorted by relevance')
            )
          )
        );
      }
      return;
    }

    searchResults.forEach(result => {
      const resultItem = createElement('div', { 
        className: 'search-result-item',
        onClick: () => {
          if (result.type === 'field') {
            handleFieldClick(result.convergeItem);
          } else {
            handleEndpointClick(result.convergeItem);
          }
        }
      });

      const confidenceColor = result.confidence >= 0.8 ? 'high' : result.confidence >= 0.6 ? 'medium' : 'low';
      
      resultItem.innerHTML = `
        <div class="result-header">
          <span class="result-type ${result.type}">${result.type}</span>
          <span class="confidence-badge ${confidenceColor}">${Math.round(result.confidence * 100)}%</span>
        </div>
        <div class="result-content">
          <div class="result-mapping">
            <span class="converge-item">${result.convergeItem}</span>
            <span class="arrow">→</span>
            <span class="elavon-item">${result.elavonItem}</span>
          </div>
        </div>
      `;

      resultsContainer.appendChild(resultItem);
    });
  }

  function renderBrowseTab() {
    const browseContainer = createElement('div', { className: 'browse-container' });
    
    browseContainer.innerHTML = `
      <div class="browse-section">
        <h3>Common Fields</h3>
        <p>Frequently used fields across all endpoints</p>
        <button onclick="loadCommonFields()" class="browse-button">
          <span class="codicon codicon-list-unordered"></span>
          View Common Fields
        </button>
      </div>
      
      <div class="browse-section">
        <h3>Endpoints</h3>
        <p>All available Converge to Elavon endpoint mappings</p>
        <button onclick="loadEndpoints()" class="browse-button">
          <span class="codicon codicon-globe"></span>
          View All Endpoints
        </button>
      </div>
      
      <div class="browse-section">
        <h3>Deprecated Fields</h3>
        <p>Fields that are no longer supported</p>
        <button onclick="loadDeprecatedFields()" class="browse-button">
          <span class="codicon codicon-warning"></span>
          View Deprecated Fields
        </button>
      </div>
    `;

    contentArea.innerHTML = '';
    contentArea.appendChild(browseContainer);
  }

  function renderStatsTab() {
    const statsContainer = createElement('div', { className: 'stats-container' });
    
    if (!currentState.mappingStats) {
      statsContainer.appendChild(
        createElement('div', { className: 'loading-stats' },
          createElement('span', { className: 'codicon codicon-loading codicon-modifier-spin' }),
          'Loading statistics...'
        )
      );
    } else {
      const stats = currentState.mappingStats;
      
      statsContainer.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${stats.totalEndpoints}</div>
            <div class="stat-label">Total Endpoints</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">${stats.totalFieldMappings}</div>
            <div class="stat-label">Field Mappings</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">${stats.commonFields}</div>
            <div class="stat-label">Common Fields</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">${stats.deprecatedFields}</div>
            <div class="stat-label">Deprecated Fields</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">${stats.transformationRules}</div>
            <div class="stat-label">Transformation Rules</div>
          </div>
        </div>
        
        <div class="stats-info">
          <h3>Dictionary Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Version:</span>
              <span class="info-value">${stats.version}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Last Updated:</span>
              <span class="info-value">${new Date(stats.lastUpdated).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div class="export-section">
          <h3>Export Options</h3>
          <div class="export-buttons">
            <button onclick="handleExport('json')" class="export-button">
              <span class="codicon codicon-file-code"></span>
              Export as JSON
            </button>
            <button onclick="handleExport('csv')" class="export-button">
              <span class="codicon codicon-table"></span>
              Export as CSV
            </button>
            <button onclick="handleExport('markdown')" class="export-button">
              <span class="codicon codicon-markdown"></span>
              Export as Markdown
            </button>
          </div>
        </div>
      `;
    }

    contentArea.innerHTML = '';
    contentArea.appendChild(statsContainer);
  }

  function renderMappingDetails(data) {
    const detailsContainer = createElement('div', { className: 'mapping-details' });
    
    const mapping = data.mapping;
    
    detailsContainer.innerHTML = `
      <div class="details-header">
        <h3>Field Mapping Details</h3>
        <button onclick="goBackToSearch()" class="back-button">
          <span class="codicon codicon-arrow-left"></span>
          Back to Search
        </button>
      </div>
      
      <div class="mapping-info">
        <div class="mapping-row">
          <span class="label">Converge Field:</span>
          <span class="value converge">${mapping.convergeField}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Elavon Field:</span>
          <span class="value elavon">${mapping.elavonField}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Data Type:</span>
          <span class="value">${mapping.dataType}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Required:</span>
          <span class="value ${mapping.required ? 'required' : 'optional'}">${mapping.required ? 'Yes' : 'No'}</span>
        </div>
        ${mapping.maxLength ? `
        <div class="mapping-row">
          <span class="label">Max Length:</span>
          <span class="value">${mapping.maxLength}</span>
        </div>
        ` : ''}
        ${mapping.notes ? `
        <div class="mapping-row">
          <span class="label">Notes:</span>
          <span class="value">${mapping.notes}</span>
        </div>
        ` : ''}
        ${data.transformationRule ? `
        <div class="mapping-row">
          <span class="label">Transformation:</span>
          <span class="value transformation">${data.transformationRule}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="code-examples">
        <h4>Code Examples</h4>
        <div class="language-buttons">
          <button onclick="handleGenerateCode('${mapping.convergeField}', 'javascript')">JavaScript</button>
          <button onclick="handleGenerateCode('${mapping.convergeField}', 'typescript')">TypeScript</button>
          <button onclick="handleGenerateCode('${mapping.convergeField}', 'php')">PHP</button>
          <button onclick="handleGenerateCode('${mapping.convergeField}', 'python')">Python</button>
          <button onclick="handleGenerateCode('${mapping.convergeField}', 'java')">Java</button>
          <button onclick="handleGenerateCode('${mapping.convergeField}', 'csharp')">C#</button>
          <button onclick="handleGenerateCode('${mapping.convergeField}', 'ruby')">Ruby</button>
        </div>
      </div>
    `;

    contentArea.innerHTML = '';
    contentArea.appendChild(detailsContainer);
  }

  function renderEndpointDetails(data) {
    const detailsContainer = createElement('div', { className: 'endpoint-details' });
    
    const mapping = data.mapping;
    
    detailsContainer.innerHTML = `
      <div class="details-header">
        <h3>Endpoint Mapping Details</h3>
        <button onclick="goBackToSearch()" class="back-button">
          <span class="codicon codicon-arrow-left"></span>
          Back to Search
        </button>
      </div>
      
      <div class="endpoint-info">
        <div class="mapping-row">
          <span class="label">Converge Endpoint:</span>
          <span class="value converge">${mapping.convergeEndpoint}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Elavon Endpoint:</span>
          <span class="value elavon">${mapping.elavonEndpoint}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Method:</span>
          <span class="value method">${mapping.method}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Description:</span>
          <span class="value">${mapping.description}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Field Count:</span>
          <span class="value">${data.fieldCount}</span>
        </div>
        <div class="mapping-row">
          <span class="label">Complexity:</span>
          <span class="value complexity-${data.complexity.complexity}">${data.complexity.complexity.toUpperCase()}</span>
        </div>
      </div>
      
      <div class="field-mappings">
        <h4>Field Mappings</h4>
        <div class="field-list">
          ${mapping.fieldMappings.map(field => `
            <div class="field-item" onclick="handleFieldClick('${field.convergeField}')">
              <span class="field-converge">${field.convergeField}</span>
              <span class="field-arrow">→</span>
              <span class="field-elavon">${field.elavonField}</span>
              <span class="field-type">${field.dataType}</span>
              ${field.required ? '<span class="field-required">Required</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    contentArea.innerHTML = '';
    contentArea.appendChild(detailsContainer);
  }

  // Global functions for onclick handlers
  window.goBackToSearch = function() {
    handleTabChange('search');
  };

  window.handleGenerateCode = handleGenerateCode;
  window.handleExport = handleExport;
  window.handleFieldClick = handleFieldClick;

  function render() {
    if (!rootElement) return;

    rootElement.innerHTML = '';

    const container = createElement('div', { className: 'documentation-panel' });

    container.appendChild(renderHeader());
    container.appendChild(renderTabs());
    
    loadingIndicator = createElement('div', { 
      className: 'loading-indicator',
      style: { display: 'none' }
    });
    loadingIndicator.innerHTML = '<span class="codicon codicon-loading codicon-modifier-spin"></span>Loading...';
    container.appendChild(loadingIndicator);
    
    contentArea = createElement('div', { className: 'content-area' });
    container.appendChild(contentArea);

    rootElement.appendChild(container);

    // Render initial tab
    handleTabChange(currentState.activeTab);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();