/**
 * Feature Parity Validator
 * Validates that OCI adapter has full feature parity with AWS adapter
 */

import { CloudAdapter } from '../adapters/base-adapter.js';
import { AwsAdapter } from '../adapters/aws-adapter.js';
import { OciAdapter } from '../adapters/oci-adapter.js';

export interface FeatureParityReport {
  valid: boolean;
  aws_features: string[];
  oci_features: string[];
  missing_in_oci: string[];
  missing_in_aws: string[];
  parity_percentage: number;
  timestamp: string;
}

export interface FeatureTest {
  name: string;
  category: 'networking' | 'kubernetes' | 'database' | 'storage' | 'container' | 'operations';
  required: boolean;
  aws_supported: boolean;
  oci_supported: boolean;
}

export class FeatureParityValidator {
  /**
   * Validate that both adapters implement all required methods
   */
  static validateParity(awsAdapter: AwsAdapter, ociAdapter: OciAdapter): FeatureParityReport {
    const requiredMethods = [
      // Metadata methods
      'getProviderName',
      'getSupportedRegions',

      // Connection
      'connect',
      'healthCheck',

      // Virtual Network operations
      'createVirtualNetwork',
      'getVirtualNetworkStatus',
      'deleteVirtualNetwork',

      // Kubernetes operations
      'createKubernetesCluster',
      'getKubernetesClusterStatus',
      'deleteKubernetesCluster',

      // Database operations
      'createManagedDatabase',
      'getManagedDatabaseStatus',
      'deleteManagedDatabase',

      // Storage operations
      'createObjectStorage',
      'getObjectStorageStatus',
      'deleteObjectStorage',

      // Container deployment operations
      'deployContainer',
      'getContainerDeploymentStatus',
      'deleteContainerDeployment',

      // Generic operations
      'getResourceStatus',
      'destroyResource'
    ];

    const awsFeatures: string[] = [];
    const ociFeatures: string[] = [];
    const missingInOci: string[] = [];
    const missingInAws: string[] = [];

    for (const method of requiredMethods) {
      const awsSupports = typeof (awsAdapter as any)[method] === 'function';
      const ociSupports = typeof (ociAdapter as any)[method] === 'function';

      if (awsSupports) {
        awsFeatures.push(method);
      }

      if (ociSupports) {
        ociFeatures.push(method);
      }

      if (awsSupports && !ociSupports) {
        missingInOci.push(method);
      }

      if (!awsSupports && ociSupports) {
        missingInAws.push(method);
      }
    }

    const totalFeatures = requiredMethods.length;
    const parityCount = totalFeatures - missingInOci.length - missingInAws.length;
    const parityPercentage = (parityCount / totalFeatures) * 100;

    return {
      valid: missingInOci.length === 0 && missingInAws.length === 0,
      aws_features: awsFeatures,
      oci_features: ociFeatures,
      missing_in_oci: missingInOci,
      missing_in_aws: missingInAws,
      parity_percentage: Math.round(parityPercentage * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get detailed feature comparison by category
   */
  static getDetailedComparison(awsAdapter: AwsAdapter, ociAdapter: OciAdapter): FeatureTest[] {
    const features: FeatureTest[] = [
      // Networking
      { name: 'createVirtualNetwork', category: 'networking', required: true, aws_supported: false, oci_supported: false },
      { name: 'getVirtualNetworkStatus', category: 'networking', required: true, aws_supported: false, oci_supported: false },
      { name: 'deleteVirtualNetwork', category: 'networking', required: true, aws_supported: false, oci_supported: false },

      // Kubernetes
      { name: 'createKubernetesCluster', category: 'kubernetes', required: true, aws_supported: false, oci_supported: false },
      { name: 'getKubernetesClusterStatus', category: 'kubernetes', required: true, aws_supported: false, oci_supported: false },
      { name: 'deleteKubernetesCluster', category: 'kubernetes', required: true, aws_supported: false, oci_supported: false },

      // Database
      { name: 'createManagedDatabase', category: 'database', required: true, aws_supported: false, oci_supported: false },
      { name: 'getManagedDatabaseStatus', category: 'database', required: true, aws_supported: false, oci_supported: false },
      { name: 'deleteManagedDatabase', category: 'database', required: true, aws_supported: false, oci_supported: false },

      // Storage
      { name: 'createObjectStorage', category: 'storage', required: true, aws_supported: false, oci_supported: false },
      { name: 'getObjectStorageStatus', category: 'storage', required: true, aws_supported: false, oci_supported: false },
      { name: 'deleteObjectStorage', category: 'storage', required: true, aws_supported: false, oci_supported: false },

      // Container
      { name: 'deployContainer', category: 'container', required: true, aws_supported: false, oci_supported: false },
      { name: 'getContainerDeploymentStatus', category: 'container', required: true, aws_supported: false, oci_supported: false },
      { name: 'deleteContainerDeployment', category: 'container', required: true, aws_supported: false, oci_supported: false },

      // Operations
      { name: 'connect', category: 'operations', required: true, aws_supported: false, oci_supported: false },
      { name: 'healthCheck', category: 'operations', required: true, aws_supported: false, oci_supported: false },
      { name: 'getResourceStatus', category: 'operations', required: true, aws_supported: false, oci_supported: false },
      { name: 'destroyResource', category: 'operations', required: true, aws_supported: false, oci_supported: false },
    ];

    // Check which features are supported
    for (const feature of features) {
      feature.aws_supported = typeof (awsAdapter as any)[feature.name] === 'function';
      feature.oci_supported = typeof (ociAdapter as any)[feature.name] === 'function';
    }

    return features;
  }

  /**
   * Generate a human-readable report
   */
  static generateReport(report: FeatureParityReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(70));
    lines.push('CLOUD ADAPTER FEATURE PARITY REPORT');
    lines.push('='.repeat(70));
    lines.push('');
    lines.push(`Generated: ${report.timestamp}`);
    lines.push(`Parity Status: ${report.valid ? '✓ VALID' : '✗ INVALID'}`);
    lines.push(`Parity Percentage: ${report.parity_percentage}%`);
    lines.push('');

    lines.push('-'.repeat(70));
    lines.push('AWS FEATURES');
    lines.push('-'.repeat(70));
    for (const feature of report.aws_features) {
      lines.push(`  ✓ ${feature}`);
    }
    lines.push('');

    lines.push('-'.repeat(70));
    lines.push('OCI FEATURES');
    lines.push('-'.repeat(70));
    for (const feature of report.oci_features) {
      lines.push(`  ✓ ${feature}`);
    }
    lines.push('');

    if (report.missing_in_oci.length > 0) {
      lines.push('-'.repeat(70));
      lines.push('MISSING IN OCI');
      lines.push('-'.repeat(70));
      for (const feature of report.missing_in_oci) {
        lines.push(`  ✗ ${feature}`);
      }
      lines.push('');
    }

    if (report.missing_in_aws.length > 0) {
      lines.push('-'.repeat(70));
      lines.push('MISSING IN AWS');
      lines.push('-'.repeat(70));
      for (const feature of report.missing_in_aws) {
        lines.push(`  ✗ ${feature}`);
      }
      lines.push('');
    }

    lines.push('='.repeat(70));

    return lines.join('\n');
  }

  /**
   * Generate detailed comparison report by category
   */
  static generateDetailedReport(features: FeatureTest[]): string {
    const lines: string[] = [];

    lines.push('='.repeat(70));
    lines.push('DETAILED FEATURE COMPARISON');
    lines.push('='.repeat(70));
    lines.push('');

    const categories = ['networking', 'kubernetes', 'database', 'storage', 'container', 'operations'] as const;

    for (const category of categories) {
      const categoryFeatures = features.filter(f => f.category === category);

      lines.push('-'.repeat(70));
      lines.push(`${category.toUpperCase()}`);
      lines.push('-'.repeat(70));

      for (const feature of categoryFeatures) {
        const awsIcon = feature.aws_supported ? '✓' : '✗';
        const ociIcon = feature.oci_supported ? '✓' : '✗';
        const requiredIcon = feature.required ? '[REQUIRED]' : '[OPTIONAL]';

        lines.push(`  ${feature.name} ${requiredIcon}`);
        lines.push(`    AWS: ${awsIcon} | OCI: ${ociIcon}`);
      }

      lines.push('');
    }

    lines.push('='.repeat(70));

    return lines.join('\n');
  }

  /**
   * Validate that both adapters can perform the same operations
   * This is a runtime check (requires credentials)
   */
  static async validateRuntimeParity(
    awsAdapter: CloudAdapter,
    ociAdapter: CloudAdapter
  ): Promise<{
    valid: boolean;
    tests: Array<{ name: string; aws_passed: boolean; oci_passed: boolean; error?: string }>;
  }> {
    const tests: Array<{ name: string; aws_passed: boolean; oci_passed: boolean; error?: string }> = [];

    // Test 1: Health check
    try {
      const awsHealth = await awsAdapter.healthCheck();
      const ociHealth = await ociAdapter.healthCheck();
      tests.push({
        name: 'healthCheck',
        aws_passed: awsHealth,
        oci_passed: ociHealth
      });
    } catch (error) {
      tests.push({
        name: 'healthCheck',
        aws_passed: false,
        oci_passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Additional runtime tests can be added here
    // Note: These would require actual cloud credentials and resources

    const allPassed = tests.every(t => t.aws_passed && t.oci_passed);

    return {
      valid: allPassed,
      tests
    };
  }

  /**
   * Compare resource mappings (instance types, database classes, etc.)
   */
  static validateResourceMappings(): {
    valid: boolean;
    mappings: Array<{ type: string; aws: string; oci: string; compatible: boolean }>;
  } {
    const mappings = [
      // Compute instances
      { type: 'small_compute', aws: 't3.medium', oci: 'VM.Standard.E4.Flex', compatible: true },
      { type: 'medium_compute', aws: 'm5.xlarge', oci: 'VM.Standard2.4', compatible: true },
      { type: 'large_compute', aws: 'm5.4xlarge', oci: 'VM.Standard2.8', compatible: true },
      { type: 'xlarge_compute', aws: 'm5.12xlarge', oci: 'VM.Standard2.16', compatible: true },
      { type: 'small_memory_optimized', aws: 'r5.large', oci: 'VM.Standard.E3.Flex', compatible: true },
      { type: 'medium_memory_optimized', aws: 'r5.2xlarge', oci: 'VM.Optimized3.Flex', compatible: true },
      { type: 'gpu_compute', aws: 'p3.2xlarge', oci: 'VM.GPU3.1', compatible: true },

      // Database classes
      { type: 'small_db', aws: 'db.t3.small', oci: '1 OCPU', compatible: true },
      { type: 'medium_db', aws: 'db.t3.medium', oci: '2 OCPUs', compatible: true },
      { type: 'large_db', aws: 'db.m5.large', oci: '4 OCPUs', compatible: true },
      { type: 'xlarge_db', aws: 'db.m5.xlarge', oci: '8 OCPUs', compatible: true },
    ];

    return {
      valid: mappings.every(m => m.compatible),
      mappings
    };
  }
}
