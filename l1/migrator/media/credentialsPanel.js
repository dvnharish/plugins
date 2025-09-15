// Credentials Panel JavaScript for VS Code webview
(function() {
  'use strict';

  // VS Code API
  const vscode = acquireVsCodeApi();
  
  let currentState = {
    hasCredentials: false,
    isValidating: false,
    validationResult: null,
    lastValidated: null,
    environment: 'sandbox'
  };

  let currentCredentials = {
    publicKey: '',
    secretKey: '',
    environment: 'sandbox',
    merchantId: ''
  };

  // DOM elements
  let rootElement;
  let publicKeyInput;
  let secretKeyInput;
  let environmentSelect;
  let merchantIdInput;
  let saveButton;
  let testButton;
  let clearButton;
  let loadButton;
  let validationStatus;
  let validationDetails;
  
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
    
    // Load existing credentials
    vscode.postMessage({ type: 'loadCredentials' });
  }

  function handleMessage(event) {
    const message = event.data;
    
    switch (message.type) {
      case 'updateState':
        currentState = { ...currentState, ...message.data };
        updateStateDisplay();
        break;
      case 'credentialsLoaded':
        currentCredentials = { ...currentCredentials, ...message.data };
        updateCredentialInputs();
        break;
      case 'credentialsSaved':
        handleCredentialsSaved(message.data);
        break;
      case 'credentialsCleared':
        handleCredentialsCleared(message.data);
        break;
      case 'validationComplete':
        handleValidationComplete(message.data);
        break;
      case 'formatValidation':
        handleFormatValidation(message.data);
        break;
      case 'validationError':
        handleValidationError(message.data);
        break;
    }
  }

  function handleCredentialsSaved(data) {
    if (data.success) {
      showNotification('Credentials saved successfully', 'success');
      // Clear sensitive inputs after saving
      if (secretKeyInput) {
        secretKeyInput.value = '••••••••••••••••••••••••••••••••';
      }
    } else {
      showNotification(`Failed to save credentials: ${data.error}`, 'error');
    }
  }

  function handleCredentialsCleared(data) {
    if (data.success) {
      showNotification('Credentials cleared successfully', 'success');
      currentCredentials = {
        publicKey: '',
        secretKey: '',
        environment: 'sandbox',
        merchantId: ''
      };
      updateCredentialInputs();
    } else {
      showNotification(`Failed to clear credentials: ${data.error}`, 'error');
    }
  }

  function handleValidationComplete(data) {
    const { result, summary, report } = data;
    
    if (validationStatus) {
      validationStatus.innerHTML = summary;
      validationStatus.className = `validation-status ${result.isValid ? 'success' : 'error'}`;
    }
    
    if (validationDetails && report) {
      validationDetails.innerHTML = report.map(line => `<div>${line}</div>`).join('');
      validationDetails.style.display = 'block';
    }
    
    showNotification(summary, result.isValid ? 'success' : 'error');
  }

  function handleFormatValidation(data) {
    const { result, summary } = data;
    
    if (validationStatus) {
      validationStatus.innerHTML = summary;
      validationStatus.className = `validation-status ${result.isValid ? 'success' : 'warning'}`;
    }
  }

  function handleValidationError(data) {
    showNotification(data.message, 'error');
    
    if (validationStatus) {
      validationStatus.innerHTML = `❌ ${data.message}`;
      validationStatus.className = 'validation-status error';
    }
  }

  function updateStateDisplay() {
    // Update button states
    if (testButton) {
      testButton.disabled = currentState.isValidating;
      testButton.innerHTML = currentState.isValidating 
        ? '<span class="codicon codicon-loading codicon-modifier-spin"></span>Validating...'
        : '<span class="codicon codicon-check"></span>Test Connection';
    }
    
    if (saveButton) {
      saveButton.disabled = currentState.isValidating;
    }
    
    if (clearButton) {
      clearButton.disabled = currentState.isValidating || !currentState.hasCredentials;
    }
  }

  function updateCredentialInputs() {
    if (publicKeyInput) {
      publicKeyInput.value = currentCredentials.publicKey || '';
    }
    
    if (secretKeyInput) {
      secretKeyInput.value = currentCredentials.secretKey || '';
    }
    
    if (environmentSelect) {
      environmentSelect.value = currentCredentials.environment || 'sandbox';
    }
    
    if (merchantIdInput) {
      merchantIdInput.value = currentCredentials.merchantId || '';
    }
  }

  function handleSaveCredentials() {
    const publicKey = publicKeyInput?.value.trim() || '';
    const secretKey = secretKeyInput?.value.trim() || '';
    const environment = environmentSelect?.value || 'sandbox';
    const merchantId = merchantIdInput?.value.trim() || '';

    if (!publicKey || !secretKey) {
      showNotification('Please enter both public key and secret key', 'error');
      return;
    }

    vscode.postMessage({
      type: 'saveCredentials',
      data: {
        publicKey,
        secretKey,
        environment,
        merchantId
      }
    });
  }

  function handleTestCredentials() {
    const publicKey = publicKeyInput?.value.trim() || '';
    const secretKey = secretKeyInput?.value.trim() || '';
    const environment = environmentSelect?.value || 'sandbox';
    const merchantId = merchantIdInput?.value.trim() || '';

    // Test current form values if they exist, otherwise test stored credentials
    if (publicKey && secretKey && !secretKey.includes('••••')) {
      vscode.postMessage({
        type: 'testCredentials',
        data: {
          publicKey,
          secretKey,
          environment,
          merchantId
        }
      });
    } else {
      vscode.postMessage({ type: 'testCredentials' });
    }
  }

  function handleClearCredentials() {
    if (confirm('Are you sure you want to clear all stored credentials? This action cannot be undone.')) {
      vscode.postMessage({ type: 'clearCredentials' });
    }
  }

  function handleLoadCredentials() {
    vscode.postMessage({ type: 'loadCredentials' });
  }

  function handleFormatValidation() {
    const publicKey = publicKeyInput?.value.trim() || '';
    const secretKey = secretKeyInput?.value.trim() || '';
    const environment = environmentSelect?.value || 'sandbox';
    const merchantId = merchantIdInput?.value.trim() || '';

    if (!publicKey || !secretKey) {
      return;
    }

    vscode.postMessage({
      type: 'validateFormat',
      data: {
        publicKey,
        secretKey,
        environment,
        merchantId
      }
    });
  }

  function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="codicon codicon-${type === 'success' ? 'check' : type === 'error' ? 'error' : 'warning'}"></span>
      ${message}
    `;
    
    // Add to page
    rootElement.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
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
    return createElement('div', { className: 'credentials-header' },
      createElement('h2', {}, 'Elavon API Credentials'),
      createElement('p', { className: 'header-description' }, 
        'Securely store and validate your Elavon API credentials for migration operations.'
      )
    );
  }

  function renderCredentialForm() {
    const form = createElement('div', { className: 'credentials-form' });

    // Public Key Input
    const publicKeyGroup = createElement('div', { className: 'form-group' },
      createElement('label', { htmlFor: 'publicKey' }, 'Public Key'),
      createElement('input', {
        type: 'text',
        id: 'publicKey',
        placeholder: 'pk_test_... or pk_live_...',
        onInput: handleFormatValidation
      }),
      createElement('small', { className: 'form-help' }, 
        'Your Elavon public key (starts with pk_test_ or pk_live_)'
      )
    );

    // Secret Key Input
    const secretKeyGroup = createElement('div', { className: 'form-group' },
      createElement('label', { htmlFor: 'secretKey' }, 'Secret Key'),
      createElement('input', {
        type: 'password',
        id: 'secretKey',
        placeholder: 'sk_test_... or sk_live_...',
        onInput: handleFormatValidation
      }),
      createElement('small', { className: 'form-help' }, 
        'Your Elavon secret key (starts with sk_test_ or sk_live_)'
      )
    );

    // Environment Select
    const environmentGroup = createElement('div', { className: 'form-group' },
      createElement('label', { htmlFor: 'environment' }, 'Environment'),
      createElement('select', { id: 'environment', onChange: handleFormatValidation },
        createElement('option', { value: 'sandbox' }, 'Sandbox (Testing)'),
        createElement('option', { value: 'production' }, 'Production (Live)')
      ),
      createElement('small', { className: 'form-help' }, 
        'Select sandbox for testing or production for live transactions'
      )
    );

    // Merchant ID Input (Optional)
    const merchantIdGroup = createElement('div', { className: 'form-group' },
      createElement('label', { htmlFor: 'merchantId' }, 'Merchant ID (Optional)'),
      createElement('input', {
        type: 'text',
        id: 'merchantId',
        placeholder: 'Your merchant identifier'
      }),
      createElement('small', { className: 'form-help' }, 
        'Optional merchant identifier for multi-merchant setups'
      )
    );

    form.appendChild(publicKeyGroup);
    form.appendChild(secretKeyGroup);
    form.appendChild(environmentGroup);
    form.appendChild(merchantIdGroup);

    // Store references to inputs
    publicKeyInput = form.querySelector('#publicKey');
    secretKeyInput = form.querySelector('#secretKey');
    environmentSelect = form.querySelector('#environment');
    merchantIdInput = form.querySelector('#merchantId');

    return form;
  }

  function renderActionButtons() {
    const buttonGroup = createElement('div', { className: 'button-group' });

    saveButton = createElement('button', {
      className: 'credentials-button primary',
      onClick: handleSaveCredentials
    });
    saveButton.innerHTML = '<span class="codicon codicon-save"></span>Save Credentials';

    testButton = createElement('button', {
      className: 'credentials-button secondary',
      onClick: handleTestCredentials
    });
    testButton.innerHTML = '<span class="codicon codicon-check"></span>Test Connection';

    clearButton = createElement('button', {
      className: 'credentials-button danger',
      onClick: handleClearCredentials
    });
    clearButton.innerHTML = '<span class="codicon codicon-trash"></span>Clear Credentials';

    loadButton = createElement('button', {
      className: 'credentials-button secondary',
      onClick: handleLoadCredentials
    });
    loadButton.innerHTML = '<span class="codicon codicon-refresh"></span>Reload';

    buttonGroup.appendChild(saveButton);
    buttonGroup.appendChild(testButton);
    buttonGroup.appendChild(clearButton);
    buttonGroup.appendChild(loadButton);

    return buttonGroup;
  }

  function renderValidationStatus() {
    const statusContainer = createElement('div', { className: 'validation-container' });

    validationStatus = createElement('div', { 
      className: 'validation-status',
      id: 'validationStatus'
    });

    validationDetails = createElement('div', { 
      className: 'validation-details',
      id: 'validationDetails',
      style: { display: 'none' }
    });

    statusContainer.appendChild(validationStatus);
    statusContainer.appendChild(validationDetails);

    return statusContainer;
  }

  function renderSecurityInfo() {
    return createElement('div', { className: 'security-info' },
      createElement('h3', {}, 'Security Information'),
      createElement('ul', { className: 'security-list' },
        createElement('li', {}, 
          createElement('span', { className: 'codicon codicon-shield' }),
          'Credentials are encrypted and stored securely using VS Code Secret Storage'
        ),
        createElement('li', {}, 
          createElement('span', { className: 'codicon codicon-lock' }),
          'Secret keys are never displayed in plain text after saving'
        ),
        createElement('li', {}, 
          createElement('span', { className: 'codicon codicon-globe' }),
          'API validation uses secure HTTPS connections to Elavon servers'
        ),
        createElement('li', {}, 
          createElement('span', { className: 'codicon codicon-eye-closed' }),
          'Credentials are only accessible within this VS Code workspace'
        )
      )
    );
  }

  function render() {
    if (!rootElement) return;

    // Clear existing content
    rootElement.innerHTML = '';

    // Create main container
    const container = createElement('div', { className: 'credentials-panel' });

    // Add components
    container.appendChild(renderHeader());
    container.appendChild(renderCredentialForm());
    container.appendChild(renderActionButtons());
    container.appendChild(renderValidationStatus());
    container.appendChild(renderSecurityInfo());

    rootElement.appendChild(container);

    // Update initial state
    updateStateDisplay();
    updateCredentialInputs();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();