import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { neo4jService } from '../database/neo4j';
import { companyService } from '../services/companyService';

// SQLite database path
const SQLITE_DB_PATH = path.join(__dirname, '../../../5rivers.app.backend.sqlite/src/db/5rivers.db');

interface SQLiteCompany {
  companyId: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteDriver {
  driverId: string;
  name: string;
  description: string | null;
  email: string;
  phone: string | null;
  hourlyRate: number;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteDispatcher {
  dispatcherId: string;
  name: string;
  description: string | null;
  email: string;
  phone: string | null;
  commissionPercent: number;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteUnit {
  unitId: string;
  name: string;
  description: string | null;
  color: string | null;
  plateNumber: string | null;
  vin: string | null;
  createdAt: string;
  updatedAt: string;
}

class SQLiteToNeo4jMigrator {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(SQLITE_DB_PATH);
  }

  private async runQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  private async getRowCount(table: string): Promise<number> {
    const result = await this.runQuery<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
    return result[0]?.count || 0;
  }

  async migrate() {
    try {
      console.log('🚀 Starting SQLite to Neo4j migration...');
      console.log(`📁 Reading from: ${SQLITE_DB_PATH}`);

      // Verify Neo4j connection
      const isConnected = await neo4jService.verifyConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Neo4j database');
      }
      console.log('✅ Neo4j connection verified');

      // Create indexes first
      await companyService.createIndexes();
      console.log('📊 Database indexes created');

      // Get data counts from SQLite
      const companiesCount = await this.getRowCount('Company');
      const driversCount = await this.getRowCount('Driver');
      const dispatchersCount = await this.getRowCount('Dispatcher');
      const unitsCount = await this.getRowCount('Unit');

      console.log(`\n📈 Data summary from SQLite:`);
      console.log(`  - Companies: ${companiesCount}`);
      console.log(`  - Drivers: ${driversCount}`);
      console.log(`  - Dispatchers: ${dispatchersCount}`);
      console.log(`  - Units: ${unitsCount}`);

      // Clear existing data in Neo4j (optional)
      console.log('\n🧹 Clearing existing Neo4j data...');
      await this.clearNeo4jData();

      // Migrate companies
      if (companiesCount > 0) {
        await this.migrateCompanies();
      }

      // Migrate drivers
      if (driversCount > 0) {
        await this.migrateDrivers();
      }

      // Migrate dispatchers
      if (dispatchersCount > 0) {
        await this.migrateDispatchers();
      }

      // Migrate units
      if (unitsCount > 0) {
        await this.migrateUnits();
      }

      console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      this.db.close();
      await neo4jService.close();
    }
  }

  private async clearNeo4jData() {
    await neo4jService.runQuery('MATCH (n) DETACH DELETE n');
    console.log('  ✅ Neo4j data cleared');
  }

  private async migrateCompanies() {
    console.log('\n🏢 Migrating companies...');
    
    const companies = await this.runQuery<SQLiteCompany>(`
      SELECT companyId, name, description, email, phone, createdAt, updatedAt 
      FROM Company 
      ORDER BY createdAt
    `);

    for (const company of companies) {
      try {
        // Map SQLite company to Neo4j company structure
        const companyData = {
          name: company.name,
          description: company.description,
          website: null, // SQLite doesn't have website field
          industry: null, // SQLite doesn't have industry field
          location: null, // SQLite doesn't have location field
          size: null, // SQLite doesn't have size field
          founded: null, // SQLite doesn't have founded field
          logo: null, // SQLite doesn't have logo field
        };

        // Create in Neo4j using the original ID
        const query = `
          CREATE (c:Company {
            id: $id,
            name: $name,
            description: $description,
            website: $website,
            industry: $industry,
            location: $location,
            size: $size,
            founded: $founded,
            logo: $logo,
            email: $email,
            phone: $phone,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN c
        `;

        await neo4jService.runQuery(query, {
          id: company.companyId,
          name: company.name,
          description: company.description,
          website: null,
          industry: null,
          location: null,
          size: null,
          founded: null,
          logo: null,
          email: company.email,
          phone: company.phone,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
        });

        console.log(`  ✅ Migrated company: ${company.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate company ${company.name}:`, error);
      }
    }

    console.log(`🏢 Companies migration completed: ${companies.length} companies`);
  }

  private async migrateDrivers() {
    console.log('\n🚗 Migrating drivers...');
    
    const drivers = await this.runQuery<SQLiteDriver>(`
      SELECT driverId, name, description, email, phone, hourlyRate, createdAt, updatedAt 
      FROM Driver 
      ORDER BY createdAt
    `);

    for (const driver of drivers) {
      try {
        const query = `
          CREATE (d:Driver {
            id: $id,
            name: $name,
            description: $description,
            email: $email,
            phone: $phone,
            hourlyRate: $hourlyRate,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN d
        `;

        await neo4jService.runQuery(query, {
          id: driver.driverId,
          name: driver.name,
          description: driver.description,
          email: driver.email,
          phone: driver.phone,
          hourlyRate: driver.hourlyRate,
          createdAt: driver.createdAt,
          updatedAt: driver.updatedAt,
        });

        console.log(`  ✅ Migrated driver: ${driver.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate driver ${driver.name}:`, error);
      }
    }

    console.log(`🚗 Drivers migration completed: ${drivers.length} drivers`);
  }

  private async migrateDispatchers() {
    console.log('\n📞 Migrating dispatchers...');
    
    const dispatchers = await this.runQuery<SQLiteDispatcher>(`
      SELECT dispatcherId, name, description, email, phone, commissionPercent, createdAt, updatedAt 
      FROM Dispatcher 
      ORDER BY createdAt
    `);

    for (const dispatcher of dispatchers) {
      try {
        const query = `
          CREATE (d:Dispatcher {
            id: $id,
            name: $name,
            description: $description,
            email: $email,
            phone: $phone,
            commissionPercent: $commissionPercent,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN d
        `;

        await neo4jService.runQuery(query, {
          id: dispatcher.dispatcherId,
          name: dispatcher.name,
          description: dispatcher.description,
          email: dispatcher.email,
          phone: dispatcher.phone,
          commissionPercent: dispatcher.commissionPercent,
          createdAt: dispatcher.createdAt,
          updatedAt: dispatcher.updatedAt,
        });

        console.log(`  ✅ Migrated dispatcher: ${dispatcher.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate dispatcher ${dispatcher.name}:`, error);
      }
    }

    console.log(`📞 Dispatchers migration completed: ${dispatchers.length} dispatchers`);
  }

  private async migrateUnits() {
    console.log('\n🚛 Migrating units...');
    
    const units = await this.runQuery<SQLiteUnit>(`
      SELECT unitId, name, description, color, plateNumber, vin, createdAt, updatedAt 
      FROM Unit 
      ORDER BY createdAt
    `);

    for (const unit of units) {
      try {
        const query = `
          CREATE (u:Unit {
            id: $id,
            name: $name,
            description: $description,
            color: $color,
            plateNumber: $plateNumber,
            vin: $vin,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN u
        `;

        await neo4jService.runQuery(query, {
          id: unit.unitId,
          name: unit.name,
          description: unit.description,
          color: unit.color,
          plateNumber: unit.plateNumber,
          vin: unit.vin,
          createdAt: unit.createdAt,
          updatedAt: unit.updatedAt,
        });

        console.log(`  ✅ Migrated unit: ${unit.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate unit ${unit.name}:`, error);
      }
    }

    console.log(`🚛 Units migration completed: ${units.length} units`);
  }
}

async function runMigration() {
  const migrator = new SQLiteToNeo4jMigrator();
  await migrator.migrate();
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✨ Migration process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigration, SQLiteToNeo4jMigrator };
