/**
 * Adapter Factory
 * Creates cloud adapter instances based on provider
 */

import { CloudAdapter } from './base-adapter.js';
import { AwsAdapter } from './aws-adapter.js';
import { OciAdapter } from './oci-adapter.js';
import { CloudProvider } from '../types/cloud-types.js';

export class AdapterFactory {
  private static adapters: Map<CloudProvider, () => CloudAdapter> = new Map<CloudProvider, () => CloudAdapter>([
    ['aws', () => new AwsAdapter() as CloudAdapter],
    ['oci', () => new OciAdapter() as CloudAdapter],
  ]);

  /**
   * Create a cloud adapter for the specified provider
   */
  static createAdapter(provider: CloudProvider): CloudAdapter {
    const adapterFactory = this.adapters.get(provider);

    if (!adapterFactory) {
      throw new Error(`No adapter found for cloud provider: ${provider}`);
    }

    return adapterFactory();
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): CloudProvider[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: CloudProvider): boolean {
    return this.adapters.has(provider);
  }
}
