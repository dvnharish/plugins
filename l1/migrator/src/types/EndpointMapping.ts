/**
 * Mapping configuration between Converge and Elavon endpoints
 */
export interface EndpointMapping {
  /** Converge endpoint path */
  convergeEndpoint: string;
  
  /** Corresponding Elavon endpoint path */
  elavonEndpoint: string;
  
  /** HTTP method for the Elavon endpoint */
  method: string;
  
  /** Field mappings from Converge to Elavon format */
  fieldMappings: Record<string, string>;
}

/**
 * Complete mapping dictionary structure
 */
export interface MappingDictionary {
  /** Array of endpoint mappings */
  mappings: EndpointMapping[];
  
  /** Version of the mapping dictionary */
  version: string;
  
  /** Last update timestamp */
  lastUpdated: Date;
}