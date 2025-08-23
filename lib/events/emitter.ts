/**
 * Event Emitter Implementation
 * Provides async event emission and listener management for the activity tracking system
 */

import { EventEmitter as NodeEventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import {
  AppEvent,
  EventEmitter,
  EventListener,
  EventContext,
  EventMetrics,
  QueuedEvent,
} from "./types";

export class ActivityEventEmitter implements EventEmitter {
  private nodeEmitter: NodeEventEmitter;
  private listeners: Map<string, Map<string, EventListener>> = new Map();
  private oneTimeListeners: Map<string, Map<string, EventListener>> = new Map();
  private eventQueue: QueuedEvent[] = [];
  private processing = false;
  private metrics: EventMetrics = {
    totalEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0,
    queueSize: 0,
    errorRate: 0,
    throughput: 0,
  };
  private processingTimes: number[] = [];
  private lastThroughputCheck = Date.now();
  private eventsInLastSecond = 0;

  constructor() {
    this.nodeEmitter = new NodeEventEmitter();
    this.nodeEmitter.setMaxListeners(100); // Increase for high-traffic scenarios
    this.startMetricsCalculation();
  }

  /**
   * Emit an event to all registered listeners
   */
  async emit<T extends AppEvent>(event: T): Promise<void> {
    try {
      this.metrics.totalEvents++;
      this.eventsInLastSecond++;

      // Add to queue for async processing
      const queuedEvent: QueuedEvent = {
        event,
        attempts: 0,
        scheduledAt: new Date(),
        processAfter: new Date(),
      };

      this.eventQueue.push(queuedEvent);
      this.metrics.queueSize = this.eventQueue.length;

      // Process queue if not already processing
      if (!this.processing) {
        setTimeout(() => this.processQueue(), 0);
      }

      // Also emit synchronously for immediate listeners
      this.nodeEmitter.emit(event.type, event);
      this.nodeEmitter.emit("*", event); // Wildcard listeners
    } catch (error) {
      console.error("Error emitting event:", error);
      this.metrics.failedEvents++;
      throw error;
    }
  }

  /**
   * Register an event listener
   */
  on<T extends AppEvent>(eventType: string, listener: EventListener<T>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Map());
    }

    const eventListeners = this.listeners.get(eventType)!;
    eventListeners.set(listener.name, listener as EventListener);

    // Sort by priority (higher priority first)
    const sortedListeners = Array.from(eventListeners.entries()).sort(
      (a, b) => b[1].priority - a[1].priority
    );

    const newMap = new Map(sortedListeners);
    this.listeners.set(eventType, newMap);
  }

  /**
   * Register a one-time event listener
   */
  once<T extends AppEvent>(
    eventType: string,
    listener: EventListener<T>
  ): void {
    if (!this.oneTimeListeners.has(eventType)) {
      this.oneTimeListeners.set(eventType, new Map());
    }

    const eventListeners = this.oneTimeListeners.get(eventType)!;
    eventListeners.set(listener.name, listener as EventListener);
  }

  /**
   * Remove an event listener
   */
  off(eventType: string, listenerName: string): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listenerName);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }

    const oneTimeListeners = this.oneTimeListeners.get(eventType);
    if (oneTimeListeners) {
      oneTimeListeners.delete(listenerName);
      if (oneTimeListeners.size === 0) {
        this.oneTimeListeners.delete(eventType);
      }
    }
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      this.oneTimeListeners.delete(eventType);
    } else {
      this.listeners.clear();
      this.oneTimeListeners.clear();
    }
  }

  /**
   * Process the event queue asynchronously
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const queuedEvent = this.eventQueue.shift()!;

        // Skip if not ready to process yet
        if (queuedEvent.processAfter > new Date()) {
          this.eventQueue.unshift(queuedEvent); // Put back at front
          break;
        }

        await this.processEvent(queuedEvent);
      }
    } catch (error) {
      console.error("Error processing event queue:", error);
    } finally {
      this.processing = false;
      this.metrics.queueSize = this.eventQueue.length;

      // Continue processing if there are more events
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(queuedEvent: QueuedEvent): Promise<void> {
    const startTime = Date.now();

    try {
      queuedEvent.attempts++;

      // Get listeners for this event type
      const listeners = this.getListenersForEvent(queuedEvent.event);

      // Process each listener
      await Promise.allSettled(
        listeners.map((listener) =>
          this.processListener(listener, queuedEvent.event)
        )
      );

      // Remove one-time listeners after successful processing
      this.removeOneTimeListeners(queuedEvent.event.type);

      this.metrics.processedEvents++;
    } catch (error) {
      console.error("Error processing event:", error);
      queuedEvent.lastError =
        error instanceof Error ? error.message : String(error);

      // Retry logic
      if (queuedEvent.attempts < 3) {
        queuedEvent.processAfter = new Date(
          Date.now() + Math.pow(2, queuedEvent.attempts) * 1000
        );
        this.eventQueue.push(queuedEvent); // Re-queue for retry
      } else {
        this.metrics.failedEvents++;
        console.error("Event failed after max retries:", queuedEvent);
      }
    } finally {
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);

      // Keep only last 100 processing times for average calculation
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }

      // Update average processing time
      this.metrics.averageProcessingTime =
        this.processingTimes.reduce((a, b) => a + b, 0) /
        this.processingTimes.length;
    }
  }

  /**
   * Get all listeners for an event
   */
  private getListenersForEvent(event: AppEvent): EventListener[] {
    const listeners: EventListener[] = [];

    // Get regular listeners
    const eventListeners = this.listeners.get(event.type);
    if (eventListeners) {
      listeners.push(...Array.from(eventListeners.values()));
    }

    // Get wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      listeners.push(...Array.from(wildcardListeners.values()));
    }

    // Get one-time listeners
    const oneTimeListeners = this.oneTimeListeners.get(event.type);
    if (oneTimeListeners) {
      listeners.push(...Array.from(oneTimeListeners.values()));
    }

    // Sort by priority
    return listeners.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Process a single listener
   */
  private async processListener(
    listener: EventListener,
    event: AppEvent
  ): Promise<void> {
    try {
      // Check if listener handles this event type
      if (
        !listener.eventTypes.includes(event.type) &&
        !listener.eventTypes.includes("*")
      ) {
        return;
      }

      await listener.handle(event);
    } catch (error) {
      console.error(`Error in listener ${listener.name}:`, error);

      // Call listener's error handler if available
      if (listener.onError) {
        try {
          await listener.onError(
            error instanceof Error ? error : new Error(String(error)),
            event
          );
        } catch (errorHandlerError) {
          console.error(
            `Error in listener ${listener.name} error handler:`,
            errorHandlerError
          );
        }
      }

      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Remove one-time listeners after processing
   */
  private removeOneTimeListeners(eventType: string): void {
    this.oneTimeListeners.delete(eventType);
  }

  /**
   * Start metrics calculation interval
   */
  private startMetricsCalculation(): void {
    setInterval(() => {
      // Calculate throughput (events per second)
      const now = Date.now();
      const timeDiff = (now - this.lastThroughputCheck) / 1000;
      this.metrics.throughput = this.eventsInLastSecond / timeDiff;

      // Calculate error rate
      if (this.metrics.totalEvents > 0) {
        this.metrics.errorRate =
          (this.metrics.failedEvents / this.metrics.totalEvents) * 100;
      }

      // Reset counters
      this.eventsInLastSecond = 0;
      this.lastThroughputCheck = now;
    }, 1000);
  }

  /**
   * Get current metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { size: number; processing: boolean; oldestEvent?: Date } {
    const oldestEvent =
      this.eventQueue.length > 0 ? this.eventQueue[0].scheduledAt : undefined;

    return {
      size: this.eventQueue.length,
      processing: this.processing,
      oldestEvent,
    };
  }

  /**
   * Clear the event queue (use with caution)
   */
  clearQueue(): void {
    this.eventQueue = [];
    this.metrics.queueSize = 0;
  }

  /**
   * Shutdown the event emitter gracefully
   */
  async shutdown(): Promise<void> {
    // Wait for current processing to finish
    while (this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Process remaining events
    await this.processQueue();

    // Clear listeners
    this.removeAllListeners();

    // Remove all Node.js event emitter listeners
    this.nodeEmitter.removeAllListeners();
  }
}

// Singleton instance
let eventEmitterInstance: ActivityEventEmitter | null = null;

export function getEventEmitter(): ActivityEventEmitter {
  if (!eventEmitterInstance) {
    eventEmitterInstance = new ActivityEventEmitter();
  }
  return eventEmitterInstance;
}

export function resetEventEmitter(): void {
  if (eventEmitterInstance) {
    eventEmitterInstance.shutdown();
    eventEmitterInstance = null;
  }
}

export default ActivityEventEmitter;
