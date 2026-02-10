/**
 * Storage Generators Index
 *
 * Exports all storage-related Terraform generators
 */

export { S3BucketGenerator } from './S3BucketGenerator';
export { DynamoDBGenerator } from './DynamoDBGenerator';

// Register all storage generators
import { GeneratorRegistry } from '../../core';
import { S3BucketGenerator } from './S3BucketGenerator';
import { DynamoDBGenerator } from './DynamoDBGenerator';

export function registerStorageGenerators(): void {
  GeneratorRegistry.register(new S3BucketGenerator());
  GeneratorRegistry.register(new DynamoDBGenerator());
  // TODO: Add EFS, EBS generators
}
