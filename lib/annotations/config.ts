/**
 * Annotation Configuration System
 * Manages global and local configuration for annotation-based event tracking
 */

import { ActivitySeverity } from "@prisma/client";
import {
  GlobalAnnotationConfig,
  BaseAnnotationConfig,
  ConfigurationProvider,
  AnnotationValidator,
} from "./types";

/**
 * Default global configuration
 */
const DEFAULT_GLOBAL_CONFIG: GlobalAnnotationConfig = {
  enabled: true,
  defaultSeverity: "INFO",
  async: true,
  includeStackTrace: false,
  sanitizeData: true,
  maxMetadataSize: 1024 * 10, // 10KB
  rateLimiting: {
    enabled: false,
    maxEventsPerMinute: 100,
  },
  filters: {
    excludePatterns: [],
    includePatterns: [],
    minSeverity: "INFO",
  },
  performance: {
    trackingThreshold: 5000, // 5 seconds
    enableMemoryTracking: false,
    enableCpuTracking: false,
  },
  security: {
    sanitizeFields: ["password", "token", "secret", "apiKey", "authorization"],
    logSecurityEvents: true,
    alertOnSuspiciousActivity: false,
  },
};

/**
 * Configuration provider implementation
 */
class DefaultConfigurationProvider implements ConfigurationProvider {
  private globalConfig: GlobalAnnotationConfig;
  private environmentOverrides: Partial<GlobalAnnotationConfig>;

  constructor() {
    this.globalConfig = { ...DEFAULT_GLOBAL_CONFIG };
    this.environmentOverrides = this.loadEnvironmentConfig();
    this.applyEnvironmentOverrides();
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalAnnotationConfig {
    return { ...this.globalConfig };
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(config: Partial<GlobalAnnotationConfig>): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }

  /**
   * Get merged configuration for a specific annotation
   */
  getMergedConfig(
    annotationConfig: BaseAnnotationConfig,
    context?: any
  ): BaseAnnotationConfig {
    const globalConfig = this.getGlobalConfig();
    
    return {
      enabled: annotationConfig.enabled ?? globalConfig.enabled,
      async: annotationConfig.async ?? globalConfig.async,
      severity: annotationConfig.severity ?? globalConfig.defaultSeverity,
      tags: [
        ...(globalConfig.tags || []),
        ...(annotationConfig.tags || []),
      ],
      metadata: {
        ...(globalConfig.metadata || {}),
        ...(annotationConfig.metadata || {}),
      },
    };
  }

  /**
   * Check if annotation should be processed based on filters
   */
  shouldProcess(
    annotationType: string,
    config: BaseAnnotationConfig,
    context?: any
  ): boolean {
    const globalConfig = this.getGlobalConfig();
    
    // Check if globally enabled
    if (!globalConfig.enabled || !config.enabled) {
      return false;
    }

    // Check severity filter
    const severity = config.severity || globalConfig.defaultSeverity;
    if (!this.meetsSeverityThreshold(severity, globalConfig.filters.minSeverity)) {
      return false;
    }

    // Check include/exclude patterns
    if (!this.matchesPatterns(annotationType, globalConfig.filters)) {
      return false;
    }

    // Check rate limiting
    if (globalConfig.rateLimiting.enabled) {
      if (!this.checkRateLimit()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentConfig(): Partial<GlobalAnnotationConfig> {
    const config: Partial<GlobalAnnotationConfig> = {};

    // Load from environment variables
    if (process.env.ANNOTATION_TRACKING_ENABLED !== undefined) {
      config.enabled = process.env.ANNOTATION_TRACKING_ENABLED === 'true';
    }

    if (process.env.ANNOTATION_DEFAULT_SEVERITY) {
      config.defaultSeverity = process.env.ANNOTATION_DEFAULT_SEVERITY as ActivitySeverity;
    }

    if (process.env.ANNOTATION_ASYNC !== undefined) {
      config.async = process.env.ANNOTATION_ASYNC === 'true';
    }

    if (process.env.ANNOTATION_INCLUDE_STACK_TRACE !== undefined) {
      config.includeStackTrace = process.env.ANNOTATION_INCLUDE_STACK_TRACE === 'true';
    }

    if (process.env.ANNOTATION_SANITIZE_DATA !== undefined) {
      config.sanitizeData = process.env.ANNOTATION_SANITIZE_DATA === 'true';
    }

    if (process.env.ANNOTATION_MAX_METADATA_SIZE) {
      config.maxMetadataSize = parseInt(process.env.ANNOTATION_MAX_METADATA_SIZE, 10);
    }

    // Rate limiting
    if (process.env.ANNOTATION_RATE_LIMIT_ENABLED !== undefined) {
      config.rateLimiting = {
        enabled: process.env.ANNOTATION_RATE_LIMIT_ENABLED === 'true',
        maxEventsPerMinute: parseInt(process.env.ANNOTATION_RATE_LIMIT_MAX_EVENTS || '100', 10),
      };
    }

    return config;
  }

  /**
   * Apply environment overrides to global config
   */
  private applyEnvironmentOverrides(): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...this.environmentOverrides,
    };
  }

  /**
   * Check if severity meets threshold
   */
  private meetsSeverityThreshold(
    severity: ActivitySeverity,
    minSeverity: ActivitySeverity
  ): boolean {
    const severityLevels: Record<ActivitySeverity, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4,
    };

    return severityLevels[severity] >= severityLevels[minSeverity];
  }

  /**
   * Check if annotation type matches include/exclude patterns
   */
  private matchesPatterns(
    annotationType: string,
    filters: GlobalAnnotationConfig['filters']
  ): boolean {
    // Check exclude patterns first
    if (filters.excludePatterns.length > 0) {
      for (const pattern of filters.excludePatterns) {
        if (this.matchesPattern(annotationType, pattern)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (filters.includePatterns.length > 0) {
      for (const pattern of filters.includePatterns) {
        if (this.matchesPattern(annotationType, pattern)) {
          return true;
        }
      }
      return false; // No include patterns matched
    }

    return true; // No patterns specified, allow all
  }

  /**
   * Check if string matches pattern (supports wildcards)
   */
  private matchesPattern(str: string, pattern: string): boolean {
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
      'i'
    );
    return regex.test(str);
  }

  /**
   * Simple rate limiting check
   */
  private checkRateLimit(): boolean {
    // Implementation would depend on your rate limiting strategy
    // This is a placeholder
    return true;
  }
}

/**
 * Annotation validator implementation
 */
class DefaultAnnotationValidator implements AnnotationValidator {
  /**
   * Validate annotation configuration
   */
  validate(config: BaseAnnotationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (config.enabled === undefined) {
      errors.push('enabled field is required');
    }

    // Validate severity
    if (config.severity && !['INFO', 'WARN', 'ERROR'].includes(config.severity)) {
      errors.push('severity must be one of: INFO, WARN, ERROR');
    }

    // Validate tags
    if (config.tags && !Array.isArray(config.tags)) {
      errors.push('tags must be an array of strings');
    }

    // Validate metadata
    if (config.metadata && typeof config.metadata !== 'object') {
      errors.push('metadata must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate global configuration
   */
  validateGlobal(config: GlobalAnnotationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate base config
    const baseValidation = this.validate(config);
    errors.push(...baseValidation.errors);

    // Validate global-specific fields
    if (config.maxMetadataSize && config.maxMetadataSize <= 0) {
      errors.push('maxMetadataSize must be positive');
    }

    if (config.rateLimiting?.maxEventsPerMinute && config.rateLimiting.maxEventsPerMinute <= 0) {
      errors.push('rateLimiting.maxEventsPerMinute must be positive');
    }

    if (config.performance?.trackingThreshold && config.performance.trackingThreshold <= 0) {
      errors.push('performance.trackingThreshold must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instances
let configProvider: ConfigurationProvider | null = null;
let validator: AnnotationValidator | null = null;

/**
 * Get the global configuration provider
 */
export function getConfigurationProvider(): ConfigurationProvider {
  if (!configProvider) {
    configProvider = new DefaultConfigurationProvider();
  }
  return configProvider;
}

/**
 * Set a custom configuration provider
 */
export function setConfigurationProvider(provider: ConfigurationProvider): void {
  configProvider = provider;
}

/**
 * Get the global annotation validator
 */
export function getAnnotationValidator(): AnnotationValidator {
  if (!validator) {
    validator = new DefaultAnnotationValidator();
  }
  return validator;
}

/**
 * Set a custom annotation validator
 */
export function setAnnotationValidator(validatorInstance: AnnotationValidator): void {
  validator = validatorInstance;
}

/**
 * Utility function to create configuration presets
 */
export const ConfigPresets = {
  /**
   * Development configuration - verbose logging, all features enabled
   */
  development: (): Partial<GlobalAnnotationConfig> => ({
    enabled: true,
    defaultSeverity: "INFO",
    includeStackTrace: true,
    sanitizeData: false,
    performance: {
      trackingThreshold: 1000,
      enableMemoryTracking: true,
      enableCpuTracking: true,
    },
    security: {
      sanitizeFields: ["password", "token"],
      logSecurityEvents: true,
      alertOnSuspiciousActivity: true,
    },
  }),

  /**
   * Production configuration - optimized for performance
   */
  production: (): Partial<GlobalAnnotationConfig> => ({
    enabled: true,
    defaultSeverity: "WARN",
    includeStackTrace: false,
    sanitizeData: true,
    maxMetadataSize: 1024 * 5, // 5KB
    rateLimiting: {
      enabled: true,
      maxEventsPerMinute: 50,
    },
    filters: {
      minSeverity: "WARN",
      excludePatterns: ["*debug*", "*test*"],
      includePatterns: [],
    },
    performance: {
      trackingThreshold: 10000,
      enableMemoryTracking: false,
      enableCpuTracking: false,
    },
  }),

  /**
   * Testing configuration - minimal tracking
   */
  testing: (): Partial<GlobalAnnotationConfig> => ({
    enabled: false,
    defaultSeverity: "ERROR",
    async: false,
    includeStackTrace: true,
    sanitizeData: false,
  }),

  /**
   * Security-focused configuration
   */
  security: (): Partial<GlobalAnnotationConfig> => ({
    enabled: true,
    defaultSeverity: "WARN",
    sanitizeData: true,
    security: {
      sanitizeFields: [
        "password", "token", "secret", "apiKey", "authorization",
        "creditCard", "ssn", "email", "phone", "address"
      ],
      logSecurityEvents: true,
      alertOnSuspiciousActivity: true,
    },
    filters: {
      includePatterns: ["*auth*", "*security*", "*admin*"],
      excludePatterns: [],
      minSeverity: "WARN",
    },
  }),
};

/**
 * Apply a configuration preset
 */
export function applyConfigPreset(
  preset: keyof typeof ConfigPresets,
  customOverrides?: Partial<GlobalAnnotationConfig>
): void {
  const provider = getConfigurationProvider();
  const presetConfig = ConfigPresets[preset]();
  const finalConfig = {
    ...presetConfig,
    ...customOverrides,
  };
  
  provider.updateGlobalConfig(finalConfig);
}

/**
 * Export configuration utilities
 */
export {
  DEFAULT_GLOBAL_CONFIG,
  DefaultConfigurationProvider,
  DefaultAnnotationValidator,
};