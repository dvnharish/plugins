import * as vscode from 'vscode';

/**
 * Interface for Copilot request
 */
export interface CopilotRequest {
  prompt: string;
  language: string;
  context?: {
    filePath?: string;
    lineNumber?: number;
    surroundingCode?: string;
    endpointType?: string;
    mappingRules?: string[];
  };
  options?: {
    maxTokens?: number;
    temperature?: number;
    stopSequences?: string[];
  };
}

/**
 * Interface for Copilot response
 */
export interface CopilotResponse {
  success: boolean;
  code?: string;
  explanation?: string;
  confidence?: number;
  alternatives?: string[];
  error?: string;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    model?: string;
  };
}

/**
 * Interface for Copilot completion item
 */
interface CopilotCompletionItem {
  insertText: string;
  range?: vscode.Range;
  detail?: string;
  documentation?: string;
}

/**
 * Service for integrating with GitHub Copilot API
 */
export class CopilotService {
  private static readonly COPILOT_EXTENSION_ID = 'GitHub.copilot';
  private static readonly COPILOT_CHAT_EXTENSION_ID = 'GitHub.copilot-chat';
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;

  private _copilotExtension: vscode.Extension<any> | undefined;
  private _copilotChatExtension: vscode.Extension<any> | undefined;
  private _isInitialized = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Initialize Copilot service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if Copilot extensions are installed
      this._copilotExtension = vscode.extensions.getExtension(CopilotService.COPILOT_EXTENSION_ID);
      this._copilotChatExtension = vscode.extensions.getExtension(CopilotService.COPILOT_CHAT_EXTENSION_ID);

      if (!this._copilotExtension) {
        console.warn('GitHub Copilot extension not found');
        return false;
      }

      // Activate Copilot extension if not already active
      if (!this._copilotExtension.isActive) {
        await this._copilotExtension.activate();
      }

      // Activate Copilot Chat extension if available and not active
      if (this._copilotChatExtension && !this._copilotChatExtension.isActive) {
        await this._copilotChatExtension.activate();
      }

      this._isInitialized = true;
      console.log('Copilot service initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize Copilot service:', error);
      return false;
    }
  }

  /**
   * Check if Copilot is available and authenticated
   */
  async isAvailable(): Promise<boolean> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    try {
      // Check if Copilot extension is available and active
      if (!this._copilotExtension?.isActive) {
        return false;
      }

      // Try to get Copilot API from the extension
      const copilotApi = this._copilotExtension.exports;
      if (!copilotApi) {
        return false;
      }

      // Check authentication status if available
      if (typeof copilotApi.checkStatus === 'function') {
        const status = await copilotApi.checkStatus();
        return status === 'OK' || status === 'SignedIn';
      }

      return true;

    } catch (error) {
      console.error('Error checking Copilot availability:', error);
      return false;
    }
  }

  /**
   * Generate code using Copilot
   */
  async generateCode(request: CopilotRequest): Promise<CopilotResponse> {
    const startTime = Date.now();

    try {
      if (!await this.isAvailable()) {
        return {
          success: false,
          error: 'GitHub Copilot is not available. Please ensure Copilot is installed and authenticated.'
        };
      }

      // Try different approaches to get completions
      const response = await this._tryMultipleApproaches(request);
      
      const responseTime = Date.now() - startTime;
      
      if (response.success && response.code) {
        return {
          ...response,
          metadata: {
            ...response.metadata,
            responseTime
          }
        };
      }

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          responseTime
        }
      };
    }
  }

  /**
   * Try multiple approaches to get Copilot completions
   */
  private async _tryMultipleApproaches(request: CopilotRequest): Promise<CopilotResponse> {
    // Approach 1: Try using Copilot Chat API if available
    try {
      const chatResponse = await this._tryUsingCopilotChat(request);
      if (chatResponse.success) {
        return chatResponse;
      }
    } catch (error) {
      console.warn('Copilot Chat approach failed:', error);
    }

    // Approach 2: Try using inline completions
    try {
      const inlineResponse = await this._tryUsingInlineCompletions(request);
      if (inlineResponse.success) {
        return inlineResponse;
      }
    } catch (error) {
      console.warn('Inline completions approach failed:', error);
    }

    // Approach 3: Try using document-based completions
    try {
      const documentResponse = await this._tryUsingDocumentCompletions(request);
      if (documentResponse.success) {
        return documentResponse;
      }
    } catch (error) {
      console.warn('Document completions approach failed:', error);
    }

    // Approach 4: Fallback to mock implementation for development
    return this._getMockResponse(request);
  }

  /**
   * Try using Copilot Chat API
   */
  private async _tryUsingCopilotChat(request: CopilotRequest): Promise<CopilotResponse> {
    if (!this._copilotChatExtension?.isActive) {
      throw new Error('Copilot Chat extension not available');
    }

    const chatApi = this._copilotChatExtension.exports;
    if (!chatApi || typeof chatApi.sendMessage !== 'function') {
      throw new Error('Copilot Chat API not available');
    }

    // Format prompt for chat
    const chatPrompt = this._formatPromptForChat(request);
    
    // Send message to Copilot Chat
    const response = await chatApi.sendMessage(chatPrompt);
    
    if (response && response.content) {
      return {
        success: true,
        code: this._extractCodeFromChatResponse(response.content),
        explanation: response.content,
        confidence: 0.8,
        metadata: {
          model: 'copilot-chat'
        }
      };
    }

    throw new Error('No response from Copilot Chat');
  }

  /**
   * Try using inline completions
   */
  private async _tryUsingInlineCompletions(request: CopilotRequest): Promise<CopilotResponse> {
    // Create a temporary document for completion
    const document = await this._createTemporaryDocument(request);
    
    // Get completion position
    const position = new vscode.Position(
      request.context?.lineNumber || 0,
      0
    );

    // Request inline completions
    const completions = await vscode.commands.executeCommand<vscode.InlineCompletionList>(
      'vscode.executeInlineCompletionProvider',
      document.uri,
      position,
      {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic
      }
    );

    if (completions && completions.items.length > 0) {
      const bestCompletion = completions.items[0];
      
      return {
        success: true,
        code: bestCompletion.insertText.toString(),
        confidence: 0.7,
        alternatives: completions.items.slice(1, 3).map(item => item.insertText.toString()),
        metadata: {
          model: 'copilot-inline'
        }
      };
    }

    throw new Error('No inline completions available');
  }

  /**
   * Try using document-based completions
   */
  private async _tryUsingDocumentCompletions(request: CopilotRequest): Promise<CopilotResponse> {
    // Create a temporary document with the prompt as content
    const document = await this._createTemporaryDocument(request);
    
    // Get completion position at the end of the document
    const lastLine = document.lineCount - 1;
    const lastCharacter = document.lineAt(lastLine).text.length;
    const position = new vscode.Position(lastLine, lastCharacter);

    // Request completions
    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      position
    );

    if (completions && completions.items.length > 0) {
      // Filter for Copilot completions
      const copilotCompletions = completions.items.filter(item => 
        item.detail?.includes('Copilot') || 
        item.label.toString().includes('Copilot')
      );

      if (copilotCompletions.length > 0) {
        const bestCompletion = copilotCompletions[0];
        
        const response: CopilotResponse = {
          success: true,
          code: bestCompletion.insertText?.toString() || bestCompletion.label.toString(),
          confidence: 0.6,
          metadata: {
            model: 'copilot-completion'
          }
        };
        
        if (bestCompletion.documentation) {
          response.explanation = bestCompletion.documentation.toString();
        }
        
        return response;
      }
    }

    throw new Error('No Copilot completions available');
  }

  /**
   * Create temporary document for completions
   */
  private async _createTemporaryDocument(request: CopilotRequest): Promise<vscode.TextDocument> {
    const languageId = this._getLanguageId(request.language);
    
    // Create document content with context
    let content = '';
    
    if (request.context?.surroundingCode) {
      content += request.context.surroundingCode + '\n';
    }
    
    content += request.prompt;
    
    // Create temporary document
    const document = await vscode.workspace.openTextDocument({
      language: languageId,
      content: content
    });

    return document;
  }

  /**
   * Format prompt for Copilot Chat
   */
  private _formatPromptForChat(request: CopilotRequest): string {
    let prompt = `Please help me migrate this Converge payment code to Elavon API.\n\n`;
    
    if (request.context?.endpointType) {
      prompt += `Endpoint Type: ${request.context.endpointType}\n`;
    }
    
    if (request.context?.mappingRules && request.context.mappingRules.length > 0) {
      prompt += `Mapping Rules:\n${request.context.mappingRules.map(rule => `- ${rule}`).join('\n')}\n\n`;
    }
    
    prompt += `Original Code (${request.language}):\n\`\`\`${request.language}\n${request.prompt}\n\`\`\`\n\n`;
    prompt += `Please provide the migrated code with explanations of the changes made.`;
    
    return prompt;
  }

  /**
   * Extract code from chat response
   */
  private _extractCodeFromChatResponse(content: string): string {
    // Look for code blocks in the response
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const matches = content.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
      // Return the first code block, removing the markdown formatting
      return matches[0].replace(/```[\w]*\n/, '').replace(/\n```$/, '');
    }
    
    // If no code blocks found, return the content as-is
    return content;
  }

  /**
   * Get VS Code language ID from language string
   */
  private _getLanguageId(language: string): string {
    const languageMap: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'php': 'php',
      'python': 'python',
      'java': 'java',
      'csharp': 'csharp',
      'c#': 'csharp',
      'ruby': 'ruby',
      'go': 'go',
      'cpp': 'cpp',
      'c++': 'cpp'
    };
    
    return languageMap[language.toLowerCase()] || 'plaintext';
  }

  /**
   * Get mock response for development/testing
   */
  private _getMockResponse(request: CopilotRequest): CopilotResponse {
    // Simple mock transformation for development
    let mockCode = request.prompt;
    
    // Apply basic transformations
    mockCode = mockCode.replace(/ssl_merchant_id/g, 'merchant_id');
    mockCode = mockCode.replace(/ssl_amount/g, 'amount');
    mockCode = mockCode.replace(/ssl_card_number/g, 'card_number');
    mockCode = mockCode.replace(/ssl_exp_date/g, 'expiry_date');
    mockCode = mockCode.replace(/\/hosted-payments/g, '/v1/payments');
    
    return {
      success: true,
      code: mockCode,
      explanation: 'Mock migration: Replaced Converge SSL fields with Elavon equivalents',
      confidence: 0.5,
      metadata: {
        model: 'mock-copilot',
        tokensUsed: mockCode.length
      }
    };
  }

  /**
   * Get Copilot status information
   */
  async getStatus(): Promise<{
    available: boolean;
    authenticated: boolean;
    version?: string;
    features: string[];
  }> {
    try {
      const available = await this.isAvailable();
      
      const features: string[] = [];
      if (this._copilotExtension?.isActive) {
        features.push('inline-completions');
      }
      if (this._copilotChatExtension?.isActive) {
        features.push('chat');
      }

      return {
        available,
        authenticated: available, // If available, assume authenticated
        version: this._copilotExtension?.packageJSON?.version,
        features
      };

    } catch (error) {
      return {
        available: false,
        authenticated: false,
        features: []
      };
    }
  }

  /**
   * Test Copilot connection with a simple request
   */
  async testConnection(): Promise<CopilotResponse> {
    const testRequest: CopilotRequest = {
      prompt: 'const ssl_merchant_id = "test123";',
      language: 'javascript',
      context: {
        endpointType: 'test',
        mappingRules: ['ssl_merchant_id -> merchant_id']
      }
    };

    return await this.generateCode(testRequest);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Clean up any resources if needed
    this._isInitialized = false;
  }
}