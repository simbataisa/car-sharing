/**
 * Annotation Registry
 * Central registry for managing annotation metadata and reflection
 */

import {
  AnnotationRegistry,
  AnnotationRegistryEntry,
  AnnotationMetadata,
} from "./types";

export class DefaultAnnotationRegistry implements AnnotationRegistry {
  private entries: Map<string, AnnotationRegistryEntry[]> = new Map();
  private targetEntries: Map<any, AnnotationRegistryEntry[]> = new Map();
  private typeEntries: Map<string, AnnotationRegistryEntry[]> = new Map();

  /**
   * Register an annotation entry
   */
  register(entry: AnnotationRegistryEntry): void {
    const key = this.getKey(entry.target, entry.propertyKey);
    
    // Add to main registry
    if (!this.entries.has(key)) {
      this.entries.set(key, []);
    }
    this.entries.get(key)!.push(entry);

    // Add to target-based index
    if (!this.targetEntries.has(entry.target)) {
      this.targetEntries.set(entry.target, []);
    }
    this.targetEntries.get(entry.target)!.push(entry);

    // Add to type-based index
    entry.annotations.forEach(annotation => {
      if (!this.typeEntries.has(annotation.type)) {
        this.typeEntries.set(annotation.type, []);
      }
      this.typeEntries.get(annotation.type)!.push(entry);
    });
  }

  /**
   * Get annotation entries by target and optional property key
   */
  get(target: any, propertyKey?: string | symbol): AnnotationRegistryEntry[] {
    if (propertyKey) {
      const key = this.getKey(target, propertyKey);
      return this.entries.get(key) || [];
    }
    return this.getByTarget(target);
  }

  /**
   * Get all annotation entries for a target
   */
  getByTarget(target: any): AnnotationRegistryEntry[] {
    return this.targetEntries.get(target) || [];
  }

  /**
   * Get annotation entries by annotation type
   */
  getByAnnotationType(type: string): AnnotationRegistryEntry[] {
    return this.typeEntries.get(type) || [];
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.targetEntries.clear();
    this.typeEntries.clear();
  }

  /**
   * Get total number of entries
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Get all entries (for debugging)
   */
  getAllEntries(): AnnotationRegistryEntry[] {
    const allEntries: AnnotationRegistryEntry[] = [];
    this.entries.forEach(entries => {
      allEntries.push(...entries);
    });
    return allEntries;
  }

  /**
   * Check if target has any annotations
   */
  hasAnnotations(target: any, propertyKey?: string | symbol): boolean {
    if (propertyKey) {
      const key = this.getKey(target, propertyKey);
      return this.entries.has(key) && this.entries.get(key)!.length > 0;
    }
    return this.targetEntries.has(target) && this.targetEntries.get(target)!.length > 0;
  }

  /**
   * Get annotations by type for a specific target and method
   */
  getAnnotationsByType(
    target: any,
    propertyKey: string | symbol,
    type: string
  ): AnnotationMetadata[] {
    const entries = this.get(target, propertyKey);
    const annotations: AnnotationMetadata[] = [];
    
    entries.forEach(entry => {
      entry.annotations.forEach(annotation => {
        if (annotation.type === type) {
          annotations.push(annotation);
        }
      });
    });
    
    return annotations;
  }

  /**
   * Remove annotations for a specific target and method
   */
  remove(target: any, propertyKey: string | symbol): boolean {
    const key = this.getKey(target, propertyKey);
    const removed = this.entries.delete(key);
    
    // Clean up target entries
    const targetEntries = this.targetEntries.get(target) || [];
    const filteredTargetEntries = targetEntries.filter(
      entry => entry.propertyKey !== propertyKey
    );
    
    if (filteredTargetEntries.length === 0) {
      this.targetEntries.delete(target);
    } else {
      this.targetEntries.set(target, filteredTargetEntries);
    }
    
    // Clean up type entries
    this.typeEntries.forEach((entries, type) => {
      const filteredEntries = entries.filter(
        entry => !(entry.target === target && entry.propertyKey === propertyKey)
      );
      
      if (filteredEntries.length === 0) {
        this.typeEntries.delete(type);
      } else {
        this.typeEntries.set(type, filteredEntries);
      }
    });
    
    return removed;
  }

  /**
   * Get statistics about the registry
   */
  getStats(): {
    totalEntries: number;
    totalTargets: number;
    totalTypes: number;
    entriesByType: Record<string, number>;
  } {
    const entriesByType: Record<string, number> = {};
    
    this.typeEntries.forEach((entries, type) => {
      entriesByType[type] = entries.length;
    });
    
    return {
      totalEntries: this.entries.size,
      totalTargets: this.targetEntries.size,
      totalTypes: this.typeEntries.size,
      entriesByType,
    };
  }

  /**
   * Generate a unique key for target and property
   */
  private getKey(target: any, propertyKey: string | symbol): string {
    const targetName = target.constructor?.name || target.name || 'Unknown';
    const propertyName = typeof propertyKey === 'symbol' 
      ? propertyKey.toString() 
      : propertyKey;
    return `${targetName}.${propertyName}`;
  }
}

// Singleton instance
let registryInstance: DefaultAnnotationRegistry | null = null;

/**
 * Get the global annotation registry instance
 */
export function getAnnotationRegistry(): AnnotationRegistry {
  if (!registryInstance) {
    registryInstance = new DefaultAnnotationRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (mainly for testing)
 */
export function resetAnnotationRegistry(): void {
  registryInstance = null;
}

export default DefaultAnnotationRegistry;