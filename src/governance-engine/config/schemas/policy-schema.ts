/**
 * JSON Schema for policy validation
 * @module @deltek/governance-engine/config/schemas/policy-schema
 */

export const policySchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['version', 'name'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Semantic version of the policy',
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Human-readable policy name',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      description: 'Policy description',
    },
    effective_date: {
      type: 'string',
      format: 'date',
      description: 'Date when policy becomes effective',
    },
    last_updated: {
      type: 'string',
      format: 'date',
      description: 'Date of last policy update',
    },
    owner: {
      type: 'string',
      description: 'Policy owner email or identifier',
    },
    extends: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Parent policy files to inherit from',
    },
    repository: {
      type: 'object',
      properties: {
        allowed_organizations: {
          type: 'array',
          items: { type: 'string' },
        },
        naming: {
          type: 'object',
          properties: {
            pattern: { type: 'string' },
            max_length: { type: 'number' },
            examples: { type: 'array', items: { type: 'string' } },
            error_message: { type: 'string' },
          },
        },
        branch_naming: {
          type: 'object',
          properties: {
            pattern: { type: 'string' },
            examples: { type: 'array', items: { type: 'string' } },
            exceptions: { type: 'array', items: { type: 'string' } },
            error_message: { type: 'string' },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
          },
        },
        commit_message: {
          type: 'object',
          properties: {
            pattern: { type: 'string' },
            types: { type: 'object', additionalProperties: { type: 'string' } },
            examples: { type: 'array', items: { type: 'string' } },
            error_message: { type: 'string' },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
          },
        },
        pull_requests: {
          type: 'object',
          properties: {
            required_approvals: { type: 'number', minimum: 0 },
            required_reviewers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  count: { type: 'number' },
                  required_for: {
                    oneOf: [
                      { type: 'string' },
                      { type: 'array', items: { type: 'string' } },
                    ],
                  },
                },
              },
            },
            required_checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  required: { type: 'boolean' },
                  threshold: { type: 'number' },
                },
              },
            },
            merge_strategy: {
              type: 'string',
              enum: ['merge', 'squash', 'rebase'],
            },
            delete_branch_on_merge: { type: 'boolean' },
            require_linear_history: { type: 'boolean' },
          },
        },
        protected_branches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              enforce_admins: { type: 'boolean' },
              require_signed_commits: { type: 'boolean' },
              require_status_checks: { type: 'boolean' },
              require_up_to_date: { type: 'boolean' },
              dismiss_stale_reviews: { type: 'boolean' },
              allowed_pushers: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    architecture: {
      type: 'object',
      properties: {
        mandatory_pattern: {
          type: 'string',
          enum: ['layered', 'hexagonal', 'clean'],
        },
        layers: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              directory: { type: 'string' },
              responsibilities: { type: 'array', items: { type: 'string' } },
              allowed_dependencies: { type: 'array', items: { type: 'string' } },
              forbidden_dependencies: { type: 'array', items: { type: 'string' } },
              allowed_imports: { type: 'array', items: { type: 'string' } },
              forbidden_imports: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string' },
            },
          },
        },
        principles: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              enforcement: { $ref: '#/definitions/enforcementLevel' },
              violations_block: { type: 'boolean' },
              notes: { type: 'string' },
            },
          },
        },
      },
    },
    code_quality: {
      type: 'object',
      properties: {
        test_coverage: {
          type: 'object',
          properties: {
            minimum_total: { type: 'number', minimum: 0, maximum: 100 },
            by_layer: { type: 'object', additionalProperties: { type: 'number' } },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
            exclude_patterns: { type: 'array', items: { type: 'string' } },
          },
        },
        linting: {
          type: 'object',
          properties: {
            zero_warnings: { type: 'boolean' },
            zero_errors: { type: 'boolean' },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
            configs: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        type_safety: {
          type: 'object',
          properties: {
            typescript: {
              type: 'object',
              properties: {
                strict_mode: { type: 'boolean' },
                no_any: { type: 'boolean' },
                no_implicit_any: { type: 'boolean' },
                no_explicit_any: { type: 'boolean' },
                strict_null_checks: { type: 'boolean' },
                strict_function_types: { type: 'boolean' },
              },
            },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
          },
        },
        complexity: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              max: { type: 'number' },
              enforcement: { $ref: '#/definitions/enforcementLevel' },
            },
          },
        },
        naming: {
          type: 'object',
          properties: {
            enforcement: { $ref: '#/definitions/enforcementLevel' },
            files: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  enum: ['camelCase', 'PascalCase', 'kebab-case', 'UPPER_SNAKE_CASE', 'snake_case'],
                },
                prefix: { type: 'string' },
                exceptions: { type: 'array', items: { type: 'string' } },
              },
            },
            classes: {
              type: 'object',
              properties: {
                pattern: { type: 'string', enum: ['camelCase', 'PascalCase', 'kebab-case', 'UPPER_SNAKE_CASE', 'snake_case'] },
                prefix: { type: 'string' },
                exceptions: { type: 'array', items: { type: 'string' } },
              },
            },
            functions: {
              type: 'object',
              properties: {
                pattern: { type: 'string', enum: ['camelCase', 'PascalCase', 'kebab-case', 'UPPER_SNAKE_CASE', 'snake_case'] },
                prefix: { type: 'string' },
                exceptions: { type: 'array', items: { type: 'string' } },
              },
            },
            constants: {
              type: 'object',
              properties: {
                pattern: { type: 'string', enum: ['camelCase', 'PascalCase', 'kebab-case', 'UPPER_SNAKE_CASE', 'snake_case'] },
                prefix: { type: 'string' },
                exceptions: { type: 'array', items: { type: 'string' } },
              },
            },
            interfaces: {
              type: 'object',
              properties: {
                pattern: { type: 'string', enum: ['camelCase', 'PascalCase', 'kebab-case', 'UPPER_SNAKE_CASE', 'snake_case'] },
                prefix: { type: 'string' },
                exceptions: { type: 'array', items: { type: 'string' } },
              },
            },
            types: {
              type: 'object',
              properties: {
                pattern: { type: 'string', enum: ['camelCase', 'PascalCase', 'kebab-case', 'UPPER_SNAKE_CASE', 'snake_case'] },
                prefix: { type: 'string' },
                exceptions: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    security: {
      type: 'object',
      properties: {
        authentication: {
          type: 'object',
          properties: {
            required: { type: 'boolean' },
            methods: { type: 'object' },
            mfa: { type: 'object' },
            session: { type: 'object' },
            tokens: { type: 'object' },
          },
        },
        authorization: {
          type: 'object',
          properties: {
            model: { type: 'string', enum: ['RBAC', 'ABAC', 'PBAC'] },
            require_on_all_endpoints: { type: 'boolean' },
            default_deny: { type: 'boolean' },
            audit_access_decisions: { type: 'boolean' },
          },
        },
        encryption: { type: 'object' },
        input_validation: {
          type: 'object',
          properties: {
            required: { type: 'boolean' },
            validate_on_boundary: { type: 'boolean' },
            sanitize_output: { type: 'boolean' },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
            patterns: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        sql_injection: {
          type: 'object',
          properties: {
            parameterized_queries_only: { type: 'boolean' },
            no_string_concatenation: { type: 'boolean' },
            orm_required: { type: 'boolean' },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
          },
        },
        secrets: {
          type: 'object',
          properties: {
            no_hardcoded: { type: 'boolean' },
            detection_tools: { type: 'array', items: { type: 'string' } },
            management: { type: 'object' },
            rotation: { type: 'object' },
            enforcement: { $ref: '#/definitions/enforcementLevel' },
          },
        },
        dependencies: {
          type: 'object',
          properties: {
            vulnerability_scanning: { type: 'boolean' },
            scan_frequency: { type: 'string' },
            blocking_thresholds: { type: 'object' },
            max_days_to_remediate: { type: 'object' },
            tools: { type: 'object' },
          },
        },
        owasp_top_10: {
          type: 'object',
          properties: {
            enforcement: { $ref: '#/definitions/enforcementLevel' },
            checks: { type: 'object' },
          },
        },
      },
    },
    compliance: { type: 'object' },
    documentation: { type: 'object' },
    enforcement: {
      type: 'object',
      properties: {
        pre_generation: {
          type: 'array',
          items: { $ref: '#/definitions/enforcementCheck' },
        },
        during_generation: {
          type: 'array',
          items: { $ref: '#/definitions/enforcementCheck' },
        },
        post_generation: {
          type: 'array',
          items: { $ref: '#/definitions/enforcementCheck' },
        },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        schema_version: { type: 'string' },
        test_mode: { type: 'boolean' },
        rollout: {
          type: 'object',
          properties: {
            percentage: { type: 'number', minimum: 0, maximum: 100 },
            exclude_projects: { type: 'array', items: { type: 'string' } },
          },
        },
        override: {
          type: 'object',
          properties: {
            allowed: { type: 'boolean' },
            requires_approval_from: { type: 'array', items: { type: 'string' } },
            audit: { type: 'boolean' },
          },
        },
      },
    },
  },
  definitions: {
    enforcementLevel: {
      type: 'string',
      enum: ['block', 'warn', 'info', 'off'],
    },
    enforcementCheck: {
      type: 'object',
      required: ['check', 'action', 'message'],
      properties: {
        check: { type: 'string' },
        action: { type: 'string', enum: ['block', 'warn', 'info'] },
        condition: { type: 'string' },
        message: { type: 'string' },
        auto_fix: { type: 'boolean' },
        fix_template: { type: 'string' },
      },
    },
  },
};
