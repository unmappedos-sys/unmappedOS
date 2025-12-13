/**
 * Database Connection Pool
 * 
 * Manages PostgreSQL connections efficiently for high concurrency.
 * Provides connection pooling and query helpers.
 * 
 * To enable direct database access:
 * 1. Install: pnpm add pg @types/pg
 * 2. Set DATABASE_URL in .env
 */

interface PoolConfig {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

// Pool client interface
interface PgPoolClient {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  release: () => void;
}

// Pool interface
interface PgPool {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  connect: () => Promise<PgPoolClient>;
  end: () => Promise<void>;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

class DatabasePool {
  private pool: PgPool | null = null;
  private initialized = false;
  private config: PoolConfig | null = null;

  async initialize(): Promise<boolean> {
    if (this.initialized) return this.pool !== null;

    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    
    if (!connectionString) {
      console.warn('No database connection string found');
      return false;
    }

    this.config = {
      connectionString,
      max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    try {
      const pgModule = await import('pg').catch(() => null);
      if (!pgModule) {
        console.warn('pg package not installed - run: pnpm add pg @types/pg');
        return false;
      }
      
      this.pool = new pgModule.Pool(this.config) as PgPool;

      // Test connection
      await this.pool.query('SELECT 1');
      
      console.log('✅ Database pool initialized');
      this.initialized = true;
      return true;
    } catch (e) {
      console.error('Database pool initialization failed:', e);
      return false;
    }
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    return this.pool.query(sql, params) as Promise<QueryResult<T>>;
  }

  async getOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows[0] || null;
  }

  async getMany<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  async execute(sql: string, params?: unknown[]): Promise<number> {
    const result = await this.query(sql, params);
    return result.rowCount;
  }

  // Transaction support
  async transaction<T>(callback: (client: TransactionClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(new TransactionClient(client));
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Pool statistics
  getStats(): PoolStats | null {
    if (!this.pool) return null;

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }
}

interface PoolStats {
  total: number;
  idle: number;
  waiting: number;
}

class TransactionClient {
  constructor(private client: PgPoolClient) {}

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return this.client.query(sql, params) as Promise<QueryResult<T>>;
  }

  async getOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows[0] || null;
  }

  async getMany<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }
}

// Singleton export
export const db = new DatabasePool();

// Common query patterns
export const UserQueries = {
  getById: (id: string) => 
    db.getOne('SELECT * FROM users WHERE id = $1', [id]),
  
  getByEmail: (email: string) => 
    db.getOne('SELECT * FROM users WHERE email = $1', [email]),
  
  updateKarma: (id: string, delta: number) =>
    db.execute('UPDATE users SET karma = karma + $2 WHERE id = $1', [id, delta]),
};

export const LeaderboardQueries = {
  topByKarma: (limit: number) =>
    db.getMany(
      'SELECT id, display_name, avatar_url, karma, badge_count FROM users ORDER BY karma DESC LIMIT $1',
      [limit]
    ),
  
  topByBadges: (limit: number) =>
    db.getMany(
      'SELECT id, display_name, avatar_url, karma, badge_count FROM users ORDER BY badge_count DESC, karma DESC LIMIT $1',
      [limit]
    ),
  
  getUserRank: (userId: string) =>
    db.getOne<{ rank: number }>(
      `SELECT COUNT(*) + 1 as rank FROM users WHERE karma > (SELECT karma FROM users WHERE id = $1)`,
      [userId]
    ),
};

export const ActivityQueries = {
  recent: (userId: string, limit: number) =>
    db.getMany(
      'SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    ),
  
  countByType: (userId: string, actionType: string, since: Date) =>
    db.getOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM activity_log WHERE user_id = $1 AND action = $2 AND created_at > $3',
      [userId, actionType, since]
    ),
};
