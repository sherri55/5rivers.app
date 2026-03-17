import neo4j, { Driver, Session, Record } from 'neo4j-driver';
import { config } from '../config';

export interface SessionConfig {
  database?: string;
}

export class Neo4jService {
  private driver: Driver;
  private readonly database: string;

  constructor() {
    this.driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
      {
        disableLosslessIntegers: true, // Convert Neo4j integers to JavaScript numbers
      }
    );
    this.database = config.neo4j.database || 'neo4j';
  }

  getSession(sessionConfig?: SessionConfig): Session {
    const db = sessionConfig?.database ?? this.database;
    return this.driver.session({ database: db });
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  async verifyConnection(): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run('RETURN 1 as test');
      return result.records.length > 0;
    } catch (error) {
      console.error('Neo4j connection failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Run a read-only or write query. Session is opened and closed per call.
   * Returns records as plain objects (record.toObject()).
   */
  async runQuery<T = any>(query: string, parameters: any = {}): Promise<T[]> {
    const session = this.getSession();
    try {
      const result = await session.run(query, parameters);
      return result.records.map((record: Record) => record.toObject());
    } finally {
      await session.close();
    }
  }

  /**
   * Execute multiple operations in a single write transaction (atomic).
   * Use for create/update/delete that must succeed or roll back together.
   */
  async executeTransaction<T>(transactionWork: (tx: any) => Promise<T>): Promise<T> {
    const session = this.getSession();
    try {
      return await session.executeWrite(transactionWork);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute read-only operations in a single transaction (consistent snapshot).
   */
  async readTransaction<T>(transactionWork: (tx: any) => Promise<T>): Promise<T> {
    const session = this.getSession();
    try {
      return await session.executeRead(transactionWork);
    } finally {
      await session.close();
    }
  }
}

export const neo4jService = new Neo4jService();
