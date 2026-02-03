/**
 * Template Seeding Script
 * Seeds pre-built infrastructure templates into the database
 */

import { PrismaClient, TemplateCategory, TemplateVisibility, LayerType } from '@prisma/client';
import { TEMPLATES, TemplateDefinition } from './templates';

/**
 * Validate template structure before insertion
 */
function validateTemplate(template: TemplateDefinition): void {
  const { name, templateData } = template;
  const { nodes, edges, metadata } = templateData;

  // Check required fields
  if (!name || name.trim().length === 0) {
    throw new Error('Template name is required');
  }

  // Validate nodes
  if (!nodes || nodes.length === 0) {
    throw new Error(`Template "${name}" has no nodes`);
  }

  // Validate each node
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!node.id) {
      throw new Error(`Template "${name}": Node missing ID`);
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`Template "${name}": Duplicate node ID ${node.id}`);
    }
    nodeIds.add(node.id);

    if (!node.type) {
      throw new Error(`Template "${name}": Node ${node.id} missing type`);
    }
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw new Error(`Template "${name}": Node ${node.id} missing valid position`);
    }
    if (!node.data) {
      throw new Error(`Template "${name}": Node ${node.id} missing data`);
    }
  }

  // Validate edges reference valid nodes
  for (const edge of edges) {
    if (!edge.id) {
      throw new Error(`Template "${name}": Edge missing ID`);
    }
    if (!nodeIds.has(edge.source)) {
      throw new Error(`Template "${name}": Edge ${edge.id} has invalid source "${edge.source}"`);
    }
    if (!nodeIds.has(edge.target)) {
      throw new Error(`Template "${name}": Edge ${edge.id} has invalid target "${edge.target}"`);
    }
  }

  // Validate metadata
  if (!metadata) {
    throw new Error(`Template "${name}" missing metadata`);
  }
  if (!metadata.estimatedCost) {
    throw new Error(`Template "${name}" missing cost estimate`);
  }
  if (typeof metadata.estimatedCost.dev !== 'number' || typeof metadata.estimatedCost.prod !== 'number') {
    throw new Error(`Template "${name}" has invalid cost estimate`);
  }
  if (!metadata.components || metadata.components.length === 0) {
    throw new Error(`Template "${name}" missing component summary`);
  }
}

/**
 * Seed a single template using upsert
 */
async function upsertTemplate(
  prisma: PrismaClient,
  template: TemplateDefinition
): Promise<void> {
  const {
    name,
    description,
    category,
    visibility,
    layerType,
    version,
    tags,
    templateData,
  } = template;

  // Validate template structure
  validateTemplate(template);

  // Map string category to enum
  const categoryEnum = category as TemplateCategory;
  const visibilityEnum = visibility as TemplateVisibility;
  const layerTypeEnum = layerType as LayerType;

  // Upsert the template
  const result = await prisma.designTemplate.upsert({
    where: { name },
    update: {
      description,
      category: categoryEnum,
      visibility: visibilityEnum,
      layerType: layerTypeEnum,
      version,
      tags,
      templateData: templateData as any,
      updatedAt: new Date(),
    },
    create: {
      name,
      description,
      category: categoryEnum,
      visibility: visibilityEnum,
      layerType: layerTypeEnum,
      version,
      tags,
      templateData: templateData as any,
      usageCount: 0,
      createdBy: 'system',
    },
  });

  console.log(`  [+] ${result.name} (${result.id}) - ${template.templateData.nodes.length} nodes, ${template.templateData.edges.length} edges`);
}

/**
 * Seed all templates
 */
export async function seedTemplates(prisma: PrismaClient): Promise<void> {
  console.log('\n==============================================');
  console.log('  Seeding Infrastructure Templates');
  console.log('==============================================\n');
  console.log(`Found ${TEMPLATES.length} templates to seed...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const template of TEMPLATES) {
    try {
      await upsertTemplate(prisma, template);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`  [!] Failed to seed "${template.name}":`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n----------------------------------------------');
  console.log(`Template seeding complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors:  ${errorCount}`);
  console.log('----------------------------------------------\n');

  if (errorCount > 0) {
    throw new Error(`${errorCount} template(s) failed to seed`);
  }
}

/**
 * Get template statistics
 */
export async function getTemplateStats(prisma: PrismaClient): Promise<void> {
  const totalCount = await prisma.designTemplate.count();
  const byCategory = await prisma.designTemplate.groupBy({
    by: ['category'],
    _count: true,
  });
  const byVisibility = await prisma.designTemplate.groupBy({
    by: ['visibility'],
    _count: true,
  });
  const byLayerType = await prisma.designTemplate.groupBy({
    by: ['layerType'],
    _count: true,
  });

  console.log('\n==============================================');
  console.log('  Template Statistics');
  console.log('==============================================\n');
  console.log(`Total Templates: ${totalCount}\n`);

  console.log('By Category:');
  for (const item of byCategory) {
    console.log(`  - ${item.category}: ${item._count}`);
  }

  console.log('\nBy Visibility:');
  for (const item of byVisibility) {
    console.log(`  - ${item.visibility}: ${item._count}`);
  }

  console.log('\nBy Layer Type:');
  for (const item of byLayerType) {
    console.log(`  - ${item.layerType || 'none'}: ${item._count}`);
  }

  console.log('\n----------------------------------------------\n');
}

/**
 * Clear all templates (for development/testing)
 */
export async function clearTemplates(prisma: PrismaClient): Promise<void> {
  const deleteResult = await prisma.designTemplate.deleteMany({
    where: { createdBy: 'system' },
  });
  console.log(`Cleared ${deleteResult.count} system templates`);
}

// Export for use in main seed file
export { TEMPLATES };
