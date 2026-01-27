/**
 * Memory Store
 *
 * Stores memories in both vector database and markdown files (hybrid storage).
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { Memory, CreateMemoryRequest, MemoryCategory, AgentType, MemoryStatus } from '../types';
import { VectorDBClient, VectorDocument } from '../vector-db/chromadb-client';
import { EmbeddingService } from '../vector-db/embedding-service';

export interface StoreConfig {
  vectorDBPath?: string;
  markdownPath?: string;
}

export class MemoryStore {
  private vectorDB: VectorDBClient;
  private embedder: EmbeddingService;
  private config: StoreConfig;
  private markdownBasePath: string;

  constructor(
    vectorDB: VectorDBClient,
    embedder: EmbeddingService,
    config?: StoreConfig
  ) {
    this.vectorDB = vectorDB;
    this.embedder = embedder;
    this.config = config || {};
    this.markdownBasePath =
      this.config.markdownPath ||
      path.join(os.homedir(), '.claude', 'governance', 'memory', 'source');
  }

  /**
   * Store a new memory
   */
  async storeMemory(request: CreateMemoryRequest): Promise<Memory> {
    const memory: Memory = {
      id: this.generateMemoryId(request.category),
      agent: request.agent,
      category: request.category,
      title: request.title,
      content: request.content,
      metadata: {
        ...request.metadata,
        usageCount: 0,
      },
      version: 1,
      status: 'active' as MemoryStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: request.createdBy,
    };

    try {
      // 1. Generate embedding
      console.log(`[MemoryStore] Generating embedding for memory ${memory.id}`);
      const embeddingText = this.generateEmbeddingText(memory);
      const optimizedText = this.embedder.optimizeTextForEmbedding(embeddingText);

      const embeddingResult = await this.embedder.generateEmbedding(optimizedText);
      memory.embedding = embeddingResult.embedding;

      // 2. Store in vector DB
      console.log(`[MemoryStore] Storing in vector DB: ${memory.id}`);
      await this.storeInVectorDB(memory);

      // 3. Store markdown backup
      console.log(`[MemoryStore] Saving markdown file: ${memory.id}`);
      await this.saveMarkdown(memory);

      console.log(`[MemoryStore] Successfully stored memory ${memory.id}`);
      return memory;
    } catch (error) {
      console.error(`[MemoryStore] Failed to store memory:`, error);
      throw new Error(`Failed to store memory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
    try {
      // Get existing memory from markdown
      const existingMemory = await this.loadMemoryFromMarkdown(id);

      if (!existingMemory) {
        throw new Error(`Memory ${id} not found`);
      }

      // Apply updates
      const updatedMemory: Memory = {
        ...existingMemory,
        ...updates,
        id: existingMemory.id, // Cannot change ID
        version: existingMemory.version + 1,
        updatedAt: new Date(),
      };

      // Regenerate embedding if content changed
      if (updates.content || updates.title) {
        const embeddingText = this.generateEmbeddingText(updatedMemory);
        const optimizedText = this.embedder.optimizeTextForEmbedding(embeddingText);
        const embeddingResult = await this.embedder.generateEmbedding(optimizedText);
        updatedMemory.embedding = embeddingResult.embedding;
      }

      // Update in vector DB
      await this.updateInVectorDB(updatedMemory);

      // Update markdown file
      await this.saveMarkdown(updatedMemory);

      console.log(`[MemoryStore] Updated memory ${id} to version ${updatedMemory.version}`);
      return updatedMemory;
    } catch (error) {
      console.error(`[MemoryStore] Failed to update memory:`, error);
      throw new Error(`Failed to update memory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a memory (soft delete - mark as archived)
   */
  async deleteMemory(id: string, reason?: string): Promise<void> {
    try {
      const memory = await this.loadMemoryFromMarkdown(id);

      if (!memory) {
        throw new Error(`Memory ${id} not found`);
      }

      // Soft delete - mark as archived
      const archivedMemory: Memory = {
        ...memory,
        status: 'archived',
        metadata: {
          ...memory.metadata,
          deprecatedAt: new Date(),
          deprecationReason: reason,
        },
        updatedAt: new Date(),
      };

      // Update in both stores
      await this.updateInVectorDB(archivedMemory);
      await this.saveMarkdown(archivedMemory);

      console.log(`[MemoryStore] Archived memory ${id}`);
    } catch (error) {
      console.error(`[MemoryStore] Failed to delete memory:`, error);
      throw new Error(`Failed to delete memory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    try {
      return await this.loadMemoryFromMarkdown(id);
    } catch (error) {
      console.error(`[MemoryStore] Failed to get memory ${id}:`, error);
      return null;
    }
  }

  /**
   * Increment usage count for a memory
   */
  async incrementUsageCount(id: string): Promise<void> {
    try {
      const memory = await this.loadMemoryFromMarkdown(id);

      if (!memory) {
        return;
      }

      memory.metadata.usageCount = (memory.metadata.usageCount || 0) + 1;
      memory.metadata.lastUsed = new Date();
      memory.updatedAt = new Date();

      await this.saveMarkdown(memory);
      console.log(`[MemoryStore] Incremented usage count for ${id}: ${memory.metadata.usageCount}`);
    } catch (error) {
      console.error(`[MemoryStore] Failed to increment usage count:`, error);
    }
  }

  /**
   * Store memory in vector database
   */
  private async storeInVectorDB(memory: Memory): Promise<void> {
    const collectionName = this.getCollectionName(memory.category);

    const document: VectorDocument = {
      id: memory.id,
      content: this.generateEmbeddingText(memory),
      embedding: memory.embedding,
      metadata: {
        agent: memory.agent,
        category: memory.category,
        title: memory.title,
        status: memory.status,
        ...memory.metadata,
        createdAt: memory.createdAt.toISOString(),
        updatedAt: memory.updatedAt.toISOString(),
      },
    };

    await this.vectorDB.addDocuments(collectionName, [document]);
  }

  /**
   * Update memory in vector database
   */
  private async updateInVectorDB(memory: Memory): Promise<void> {
    const collectionName = this.getCollectionName(memory.category);

    const document: VectorDocument = {
      id: memory.id,
      content: this.generateEmbeddingText(memory),
      embedding: memory.embedding,
      metadata: {
        agent: memory.agent,
        category: memory.category,
        title: memory.title,
        status: memory.status,
        ...memory.metadata,
        createdAt: memory.createdAt.toISOString(),
        updatedAt: memory.updatedAt.toISOString(),
      },
    };

    await this.vectorDB.updateDocument(collectionName, document);
  }

  /**
   * Save memory as markdown file
   */
  private async saveMarkdown(memory: Memory): Promise<void> {
    const categoryPath = path.join(this.markdownBasePath, memory.category);
    await fs.mkdir(categoryPath, { recursive: true });

    const filePath = path.join(categoryPath, `${memory.id}.md`);

    const markdown = this.formatAsMarkdown(memory);
    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  /**
   * Load memory from markdown file
   */
  private async loadMemoryFromMarkdown(id: string): Promise<Memory | null> {
    // Try to find the file across all categories
    const categories: MemoryCategory[] = [
      'code-patterns',
      'security-findings',
      'architecture-decisions',
      'test-strategies',
      'deployment-patterns',
      'compliance-rules',
      'failed-approaches',
      'deltek-knowledge',
    ];

    for (const category of categories) {
      const categoryPath = path.join(this.markdownBasePath, category);
      const filePath = path.join(categoryPath, `${id}.md`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return this.parseMarkdown(content);
      } catch (error) {
        // File not found in this category, try next
        continue;
      }
    }

    return null;
  }

  /**
   * Format memory as markdown
   */
  private formatAsMarkdown(memory: Memory): string {
    const metadata = {
      id: memory.id,
      agent: memory.agent,
      category: memory.category,
      version: memory.version,
      status: memory.status,
      created: memory.createdAt.toISOString(),
      updated: memory.updatedAt.toISOString(),
      createdBy: memory.createdBy,
      ...memory.metadata,
    };

    const frontMatter = Object.entries(metadata)
      .map(([key, value]) => {
        if (value === undefined || value === null) return '';
        if (Array.isArray(value)) {
          return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
        }
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      })
      .filter(Boolean)
      .join('\n');

    return `---
${frontMatter}
---

# ${memory.title}

${memory.content}
`;
  }

  /**
   * Parse markdown file to Memory object
   */
  private parseMarkdown(markdown: string): Memory | null {
    try {
      // Extract front matter
      const frontMatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
      if (!frontMatterMatch) {
        console.error('[MemoryStore] Invalid markdown format: missing front matter');
        return null;
      }

      const frontMatter = frontMatterMatch[1];
      const contentAfterFrontMatter = markdown.substring(frontMatterMatch[0].length).trim();

      // Parse front matter
      const metadata: any = {};
      const lines = frontMatter.split('\n');
      let currentKey = '';

      for (const line of lines) {
        if (line.startsWith('  - ')) {
          // Array item
          if (currentKey) {
            if (!Array.isArray(metadata[currentKey])) {
              metadata[currentKey] = [];
            }
            metadata[currentKey].push(line.substring(4).trim());
          }
        } else if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          currentKey = key.trim();
          const value = valueParts.join(':').trim();

          if (value) {
            try {
              metadata[currentKey] = JSON.parse(value);
            } catch {
              metadata[currentKey] = value;
            }
          }
        }
      }

      // Extract title and content
      const titleMatch = contentAfterFrontMatter.match(/^# (.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
      const content = contentAfterFrontMatter.replace(/^# .+\n+/, '').trim();

      // Construct Memory object
      const memory: Memory = {
        id: metadata.id,
        agent: metadata.agent,
        category: metadata.category,
        title,
        content,
        metadata: {
          ...metadata,
          createdAt: undefined,
          updatedAt: undefined,
        },
        version: metadata.version || 1,
        status: metadata.status || 'active',
        createdAt: new Date(metadata.created),
        updatedAt: new Date(metadata.updated),
        createdBy: metadata.createdBy,
      };

      return memory;
    } catch (error) {
      console.error('[MemoryStore] Failed to parse markdown:', error);
      return null;
    }
  }

  /**
   * Generate embedding text from memory
   */
  private generateEmbeddingText(memory: Memory): string {
    const parts = [
      memory.title,
      memory.content,
      memory.metadata.tags?.join(' ') || '',
    ];

    return parts.filter(Boolean).join('\n\n');
  }

  /**
   * Generate unique memory ID
   */
  private generateMemoryId(category: MemoryCategory): string {
    const prefix = this.getCategoryPrefix(category);
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const uuid = uuidv4().split('-')[0];
    return `${prefix}-${timestamp}-${uuid}`;
  }

  /**
   * Get category prefix for memory ID
   */
  private getCategoryPrefix(category: MemoryCategory): string {
    const prefixes: Record<MemoryCategory, string> = {
      'code-patterns': 'PATTERN',
      'security-findings': 'SEC',
      'architecture-decisions': 'ADR',
      'test-strategies': 'TEST',
      'deployment-patterns': 'DEPLOY',
      'compliance-rules': 'COMP',
      'failed-approaches': 'ANTI',
      'deltek-knowledge': 'DELTEK',
    };

    return prefixes[category];
  }

  /**
   * Get collection name for category
   */
  private getCollectionName(category: MemoryCategory): string {
    return category.replace(/-/g, '_');
  }
}
