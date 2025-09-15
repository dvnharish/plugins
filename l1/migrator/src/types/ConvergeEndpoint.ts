/**
 * Represents a detected Converge endpoint in the codebase
 */
export interface ConvergeEndpoint {
  /** Unique identifier for the endpoint */
  id: string;
  
  /** File path where the endpoint was found */
  filePath: string;
  
  /** Line number in the file */
  lineNumber: number;
  
  /** Type of Converge endpoint */
  endpointType: ConvergeEndpointType;
  
  /** The actual code containing the endpoint */
  code: string;
  
  /** SSL fields found in the code */
  sslFields: string[];
}

/**
 * Types of Converge endpoints that can be migrated
 */
export enum ConvergeEndpointType {
  HOSTED_PAYMENTS = 'hosted-payments',
  CHECKOUT = 'Checkout.js',
  PROCESS_TRANSACTION = 'ProcessTransactionOnline',
  BATCH_PROCESSING = 'batch-processing',
  DEVICE_MANAGEMENT = 'NonElavonCertifiedDevice'
}