/**
 * Type declarations for optional dependencies
 * 
 * These packages are only needed in production:
 * - @upstash/redis - for distributed caching
 * - @upstash/kafka - for message queuing
 * - pg - for direct database access with pooling
 * 
 * Install them with: pnpm add @upstash/redis @upstash/kafka pg @types/pg
 */

// Stub types for @upstash/redis
declare module '@upstash/redis' {
  export interface RedisOptions {
    url: string;
    token: string;
  }

  export class Redis {
    constructor(options: RedisOptions);
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T, options?: { ex?: number }): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    scan(
      cursor: number,
      options: { match: string; count: number }
    ): Promise<[string, string[]]>;
  }
}

// Stub types for @upstash/kafka
declare module '@upstash/kafka' {
  export interface KafkaOptions {
    url: string;
    username: string;
    password: string;
  }

  export interface ProduceMessage {
    value: string;
    key?: string;
    partition?: number;
    timestamp?: number;
  }

  export interface Producer {
    produce(topic: string, message: ProduceMessage): Promise<{ partition: number; offset: number }>;
  }

  export interface Consumer {
    consume(options: { consumerGroupId: string; topics: string[]; autoOffsetReset: 'earliest' | 'latest' }): Promise<unknown>;
  }

  export class Kafka {
    constructor(options: KafkaOptions);
    producer(): Producer;
    consumer(): Consumer;
  }
}

// Stub types for pg (Pool)
declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
    rowCount: number;
    command: string;
    fields: unknown[];
  }

  export interface PoolClient {
    query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    release(err?: Error | boolean): void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }
}
