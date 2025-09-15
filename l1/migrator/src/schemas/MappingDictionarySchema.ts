/**
 * JSON Schema for mapping dictionary validation
 */
export const MappingDictionarySchema = {
  type: 'object' as const,
  required: ['version', 'lastUpdated', 'mappings'],
  properties: {
    version: {
      type: 'string' as const,
      pattern: '^\\d+\\.\\d+\\.\\d+$'
    },
    lastUpdated: {
      type: 'string' as const,
      format: 'date-time'
    },
    mappings: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        required: ['convergeEndpoint', 'elavonEndpoint', 'method', 'fieldMappings'],
        properties: {
          convergeEndpoint: {
            type: 'string' as const,
            minLength: 1
          },
          elavonEndpoint: {
            type: 'string' as const,
            minLength: 1
          },
          method: {
            type: 'string' as const,
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
          },
          fieldMappings: {
            type: 'object' as const,
            patternProperties: {
              '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                type: 'string' as const,
                minLength: 1
              }
            },
            additionalProperties: false
          },
          description: {
            type: 'string' as const
          },
          examples: {
            type: 'array' as const,
            items: {
              type: 'object' as const
            }
          }
        },
        additionalProperties: false
      }
    },
    metadata: {
      type: 'object' as const,
      properties: {
        author: { type: 'string' as const },
        description: { type: 'string' as const },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const }
        }
      }
    }
  },
  additionalProperties: false
};

/**
 * Schema for custom mapping extensions
 */
export const CustomMappingSchema = {
  type: 'object' as const,
  required: ['name', 'mappings'],
  properties: {
    name: {
      type: 'string' as const,
      minLength: 1
    },
    description: {
      type: 'string' as const
    },
    version: {
      type: 'string' as const,
      pattern: '^\\d+\\.\\d+\\.\\d+$'
    },
    mappings: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        required: ['convergeEndpoint', 'elavonEndpoint', 'method', 'fieldMappings'],
        properties: {
          convergeEndpoint: {
            type: 'string' as const,
            minLength: 1
          },
          elavonEndpoint: {
            type: 'string' as const,
            minLength: 1
          },
          method: {
            type: 'string' as const,
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
          },
          fieldMappings: {
            type: 'object' as const,
            patternProperties: {
              '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                type: 'string' as const,
                minLength: 1
              }
            }
          },
          overrides: {
            type: 'boolean' as const,
            default: false
          }
        }
      }
    }
  }
};

/**
 * Schema for migration rules configuration
 */
export const MigrationRulesSchema = {
  type: 'object' as const,
  properties: {
    rules: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        required: ['name', 'pattern', 'action'],
        properties: {
          name: {
            type: 'string' as const,
            minLength: 1
          },
          description: {
            type: 'string' as const
          },
          pattern: {
            type: 'string' as const,
            minLength: 1
          },
          action: {
            type: 'string' as const,
            enum: ['transform', 'ignore', 'warn', 'error']
          },
          replacement: {
            type: 'string' as const
          },
          conditions: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                field: { type: 'string' as const },
                operator: { 
                  type: 'string' as const,
                  enum: ['equals', 'contains', 'startsWith', 'endsWith', 'regex']
                },
                value: { type: 'string' as const }
              }
            }
          }
        }
      }
    },
    globalSettings: {
      type: 'object' as const,
      properties: {
        preserveComments: { type: 'boolean' as const, default: true },
        addMigrationComments: { type: 'boolean' as const, default: true },
        validateAfterMigration: { type: 'boolean' as const, default: true }
      }
    }
  }
};