/**
 * Message Queue Provider
 * 
 * Handles async operations like:
 * - Activity logging
 * - Karma updates
 * - Badge calculations
 * - Analytics events
 * 
 * To enable Kafka:
 * 1. Install: pnpm add @upstash/kafka
 * 2. Set UPSTASH_KAFKA_REST_URL, UPSTASH_KAFKA_REST_USERNAME, UPSTASH_KAFKA_REST_PASSWORD in .env
 */

interface QueueMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  userId?: string;
  correlationId?: string;
}

interface QueueConfig {
  url: string;
  username: string;
  password: string;
}

type MessageHandler<T = unknown> = (message: QueueMessage<T>) => Promise<void>;

// Queue topics
export const QueueTopics = {
  ACTIVITY: 'activity-log',
  KARMA: 'karma-updates',
  BADGES: 'badge-calculations',
  ANALYTICS: 'analytics-events',
  NOTIFICATIONS: 'user-notifications',
} as const;

type QueueTopic = typeof QueueTopics[keyof typeof QueueTopics];

// In-memory queue for development
class MemoryQueue {
  private queues: Map<string, QueueMessage[]> = new Map();
  private handlers: Map<string, MessageHandler[]> = new Map();
  private processing: Set<string> = new Set();

  async publish<T>(topic: QueueTopic, message: Omit<QueueMessage<T>, 'timestamp'>): Promise<boolean> {
    const fullMessage: QueueMessage<T> = {
      ...message,
      timestamp: Date.now(),
    };

    const queue = this.queues.get(topic) || [];
    queue.push(fullMessage);
    this.queues.set(topic, queue);

    // Process immediately in dev
    this.processQueue(topic);

    return true;
  }

  subscribe(topic: QueueTopic, handler: MessageHandler): void {
    const handlers = this.handlers.get(topic) || [];
    handlers.push(handler);
    this.handlers.set(topic, handlers);
  }

  private async processQueue(topic: QueueTopic): Promise<void> {
    if (this.processing.has(topic)) return;
    this.processing.add(topic);

    try {
      const queue = this.queues.get(topic) || [];
      const handlers = this.handlers.get(topic) || [];

      while (queue.length > 0) {
        const message = queue.shift();
        if (!message) continue;

        for (const handler of handlers) {
          try {
            await handler(message);
          } catch (e) {
            console.error(`Handler error for ${topic}:`, e);
          }
        }
      }
    } finally {
      this.processing.delete(topic);
    }
  }
}

// Kafka producer interface
interface KafkaProducer {
  produce: (topic: string, msg: { value: string }) => Promise<unknown>;
}

// Kafka queue for production
class KafkaQueue {
  private config: QueueConfig | null = null;
  private producer: KafkaProducer | null = null;

  async initialize(): Promise<boolean> {
    const url = process.env.UPSTASH_KAFKA_REST_URL;
    const username = process.env.UPSTASH_KAFKA_REST_USERNAME;
    const password = process.env.UPSTASH_KAFKA_REST_PASSWORD;

    if (!url || !username || !password) {
      console.warn('Kafka not configured');
      return false;
    }

    this.config = { url, username, password };

    try {
      const upstashKafka = await import('@upstash/kafka').catch(() => null);
      if (!upstashKafka) {
        console.warn('Kafka package not installed - run: pnpm add @upstash/kafka');
        return false;
      }
      
      const kafka = new upstashKafka.Kafka({ url, username, password });
      this.producer = kafka.producer() as KafkaProducer;
      console.log('Kafka queue initialized');
      return true;
    } catch (e) {
      console.warn('Kafka initialization failed:', e);
      return false;
    }
  }

  async publish<T>(topic: QueueTopic, message: Omit<QueueMessage<T>, 'timestamp'>): Promise<boolean> {
    if (!this.producer) return false;

    try {
      const fullMessage: QueueMessage<T> = {
        ...message,
        timestamp: Date.now(),
      };

      await this.producer.produce(topic, {
        value: JSON.stringify(fullMessage),
      });
      return true;
    } catch (e) {
      console.error('Kafka publish error:', e);
      return false;
    }
  }
}

// Unified queue interface
class MessageQueue {
  private memoryQueue = new MemoryQueue();
  private kafkaQueue = new KafkaQueue();
  private useKafka = false;
  private initialized = false;

  async initialize(): Promise<'kafka' | 'memory'> {
    if (this.initialized) {
      return this.useKafka ? 'kafka' : 'memory';
    }

    const hasKafka = process.env.UPSTASH_KAFKA_REST_URL;
    
    if (hasKafka) {
      this.useKafka = await this.kafkaQueue.initialize();
      if (this.useKafka) {
        console.log('✅ Using Kafka queue');
      }
    }
    
    if (!this.useKafka) {
      console.log('📦 Using in-memory queue');
    }

    this.initialized = true;
    return this.useKafka ? 'kafka' : 'memory';
  }

  async publish<T>(topic: QueueTopic, message: Omit<QueueMessage<T>, 'timestamp'>): Promise<boolean> {
    if (this.useKafka) {
      return this.kafkaQueue.publish(topic, message);
    }
    return this.memoryQueue.publish(topic, message);
  }

  subscribe(topic: QueueTopic, handler: MessageHandler): void {
    // Only memory queue supports local subscriptions
    // Kafka subscriptions should be set up via separate consumer service
    this.memoryQueue.subscribe(topic, handler);
  }
}

// Singleton
export const messageQueue = new MessageQueue();

// Pre-built message types
export interface ActivityMessage {
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
  zoneId?: string;
}

export interface KarmaMessage {
  userId: string;
  delta: number;
  reason: string;
  sourceUserId?: string;
}

export interface BadgeMessage {
  userId: string;
  trigger: string;
  currentStats?: Record<string, number>;
}

export interface AnalyticsMessage {
  event: string;
  properties: Record<string, unknown>;
  userId?: string;
  anonymousId?: string;
}

// Convenience publishers
export const publishActivity = (message: ActivityMessage): Promise<boolean> => {
  return messageQueue.publish(QueueTopics.ACTIVITY, {
    type: 'activity',
    payload: message,
    userId: message.userId,
  });
};

export const publishKarmaUpdate = (message: KarmaMessage): Promise<boolean> => {
  return messageQueue.publish(QueueTopics.KARMA, {
    type: 'karma',
    payload: message,
    userId: message.userId,
  });
};

export const publishBadgeCheck = (message: BadgeMessage): Promise<boolean> => {
  return messageQueue.publish(QueueTopics.BADGES, {
    type: 'badge-check',
    payload: message,
    userId: message.userId,
  });
};

export const publishAnalytics = (message: AnalyticsMessage): Promise<boolean> => {
  return messageQueue.publish(QueueTopics.ANALYTICS, {
    type: 'analytics',
    payload: message,
    userId: message.userId,
  });
};
