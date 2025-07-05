import neo4j, { Driver, Session, Record } from 'neo4j-driver';
import { config } from '../config';

export class Neo4jService {
  private driver: Driver;

  constructor() {
    this.driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
      {
        disableLosslessIntegers: true,
      }
    );
  }

  getSession(): Session {
    return this.driver.session();
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

  // Utility method to run queries with proper session management
  async runQuery<T = any>(
    query: string,
    parameters: any = {}
  ): Promise<T[]> {
    const session = this.getSession();
    try {
      const result = await session.run(query, parameters);
      return result.records.map((record: Record) => record.toObject());
    } finally {
      await session.close();
    }
  }

  // Method for transactions
  async executeTransaction<T>(
    transactionWork: (tx: any) => Promise<T>
  ): Promise<T> {
    const session = this.getSession();
    try {
      return await session.executeWrite(transactionWork);
    } finally {
      await session.close();
    }
  }
}

export const neo4jService = new Neo4jService();
