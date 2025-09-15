/**
 * Result of validating a migration against Elavon sandbox
 */
export interface ValidationResult {
  /** Whether the validation was successful */
  success: boolean;
  
  /** Response from the sandbox API (if successful) */
  response?: any;
  
  /** Error message (if failed) */
  error?: string;
  
  /** HTTP status code */
  statusCode?: number;
}