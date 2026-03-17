import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { neo4jService } from '../database/neo4j';

// SQLite database path
const SQLITE_DB_PATH = path.join(__dirname, '../../../5rivers.app.backend.sqlite/src/db/5rivers.db');

// SQLite table interfaces
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

interface SQLiteJobType {
  jobTypeId: string;
  title: string;
  startLocation: string | null;
  endLocation: string | null;
  dispatchType: string;
  rateOfJob: number;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteJob {
  jobId: string;
  jobDate: string;
  jobGrossAmount: number | null;
  jobTypeId: string | null;
  driverId: string | null;
  dispatcherId: string | null;
  unitId: string | null;
  invoiceId: string | null;
  invoiceStatus: string;
  weight: string | null;
  loads: number | null;
  startTime: string | null;
  endTime: string | null;
  ticketIds: string | null;
  paymentReceived: boolean;
  driverPaid: boolean;
  imageUrls: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteInvoice {
  invoiceId: string;
  dispatcherId: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  subTotal: number | null;
  dispatchPercent: number | null;
  commission: number | null;
  hst: number | null;
  total: number | null;
  billedTo: string | null;
  billedEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteInvoiceLine {
  invoiceLineId: string;
  invoiceId: string;
  jobId: string;
  lineAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteDriverRate {
  driverRateId: string;
  driverId: string;
  jobTypeId: string;
  hourlyRate: number | null;
  percentageRate: number | null;
  createdAt: string;
  updatedAt: string;
}

class ComprehensiveDataMigrator {
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

  // Helper function to convert different date formats to Neo4j-compatible ISO strings
  private formatDateForNeo4j(value: any, type: 'date' | 'datetime' | 'time' = 'datetime'): string | null {
    if (!value) return null;

    try {
      if (type === 'datetime') {
        // Handle Unix timestamps (milliseconds) or ISO strings
        if (typeof value === 'number') {
          return new Date(value).toISOString();
        } else if (typeof value === 'string') {
          // Try to parse as ISO string
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      } else if (type === 'date') {
        // Handle date strings like "2025-02-04"
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return value; // Already in correct format
        } else if (typeof value === 'number') {
          return new Date(value).toISOString().split('T')[0];
        }
      } else if (type === 'time') {
        // Handle time strings like "07:15"
        if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
          return value + ':00'; // Add seconds to make it HH:MM:SS
        }
      }
    } catch (error) {
      console.warn(`Failed to format date: ${value}`, error);
    }

    return null;
  }

  async migrateAll() {
    try {
      console.log('🚀 Starting comprehensive SQLite to Neo4j migration...');

      // Verify Neo4j connection
      const isConnected = await neo4jService.verifyConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Neo4j database');
      }
      console.log('✅ Neo4j connection verified');

      // Clear existing data
      console.log('🧹 Clearing existing Neo4j data...');
      await neo4jService.runQuery('MATCH (n) DETACH DELETE n');

      // Create comprehensive indexes
      await this.createAllIndexes();

      // Migrate in order (to handle dependencies)
      await this.migrateCompanies();
      await this.migrateDrivers();
      await this.migrateDispatchers();
      await this.migrateUnits();
      await this.migrateJobTypes();
      await this.migrateJobs();
      await this.migrateInvoices();
      await this.migrateInvoiceLines();
      await this.migrateDriverRates();

      // Create relationships
      await this.createRelationships();

      console.log('\n🎉 Comprehensive migration completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      this.db.close();
      await neo4jService.close();
    }
  }

  private async createAllIndexes() {
    console.log('📊 Creating comprehensive indexes...');
    
    const indexes = [
      // Basic entity indexes
      'CREATE INDEX company_id_index IF NOT EXISTS FOR (c:Company) ON (c.id)',
      'CREATE INDEX driver_id_index IF NOT EXISTS FOR (d:Driver) ON (d.id)',
      'CREATE INDEX dispatcher_id_index IF NOT EXISTS FOR (d:Dispatcher) ON (d.id)',
      'CREATE INDEX unit_id_index IF NOT EXISTS FOR (u:Unit) ON (u.id)',
      
      // Business logic indexes
      'CREATE INDEX jobtype_id_index IF NOT EXISTS FOR (jt:JobType) ON (jt.id)',
      'CREATE INDEX job_id_index IF NOT EXISTS FOR (j:Job) ON (j.id)',
      'CREATE INDEX invoice_id_index IF NOT EXISTS FOR (i:Invoice) ON (i.id)',
      'CREATE INDEX invoiceline_id_index IF NOT EXISTS FOR (il:InvoiceLine) ON (il.id)',
      'CREATE INDEX driverrate_id_index IF NOT EXISTS FOR (dr:DriverRate) ON (dr.id)',
      
      // Search indexes
      'CREATE INDEX company_name_index IF NOT EXISTS FOR (c:Company) ON (c.name)',
      'CREATE INDEX job_date_index IF NOT EXISTS FOR (j:Job) ON (j.jobDate)',
      'CREATE INDEX invoice_number_index IF NOT EXISTS FOR (i:Invoice) ON (i.invoiceNumber)',
    ];

    for (const indexQuery of indexes) {
      try {
        await neo4jService.runQuery(indexQuery);
      } catch (error) {
        console.warn(`Index creation warning: ${error}`);
      }
    }
    
    console.log('✅ Indexes created');
  }

  private async migrateCompanies() {
    console.log('\n🏢 Migrating Companies...');
    
    const companies = await this.runQuery<SQLiteCompany>(`
      SELECT * FROM Company ORDER BY createdAt
    `);

    for (const company of companies) {
      try {
        const query = `
          CREATE (c:Company {
            id: $id,
            name: $name,
            description: $description,
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
          email: company.email,
          phone: company.phone,
          createdAt: this.formatDateForNeo4j(company.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(company.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated Company: ${company.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate Company ${company.name}:`, error);
      }
    }

    console.log(`🏢 Companies migration completed: ${companies.length} companies`);
  }

  private async migrateDrivers() {
    console.log('\n🚗 Migrating Drivers...');
    
    const drivers = await this.runQuery<SQLiteDriver>(`
      SELECT * FROM Driver ORDER BY createdAt
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
          createdAt: this.formatDateForNeo4j(driver.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(driver.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated Driver: ${driver.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate Driver ${driver.name}:`, error);
      }
    }

    console.log(`🚗 Drivers migration completed: ${drivers.length} drivers`);
  }

  private async migrateDispatchers() {
    console.log('\n📋 Migrating Dispatchers...');
    
    const dispatchers = await this.runQuery<SQLiteDispatcher>(`
      SELECT * FROM Dispatcher ORDER BY createdAt
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
          createdAt: this.formatDateForNeo4j(dispatcher.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(dispatcher.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated Dispatcher: ${dispatcher.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate Dispatcher ${dispatcher.name}:`, error);
      }
    }

    console.log(`📋 Dispatchers migration completed: ${dispatchers.length} dispatchers`);
  }

  private async migrateUnits() {
    console.log('\n🚛 Migrating Units...');
    
    const units = await this.runQuery<SQLiteUnit>(`
      SELECT * FROM Unit ORDER BY createdAt
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
          createdAt: this.formatDateForNeo4j(unit.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(unit.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated Unit: ${unit.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate Unit ${unit.name}:`, error);
      }
    }

    console.log(`🚛 Units migration completed: ${units.length} units`);
  }

  private async migrateJobTypes() {
    console.log('\n📋 Migrating JobTypes...');
    
    const jobTypes = await this.runQuery<SQLiteJobType>(`
      SELECT * FROM JobType ORDER BY createdAt
    `);

    for (const jobType of jobTypes) {
      try {
        const query = `
          CREATE (jt:JobType {
            id: $id,
            title: $title,
            startLocation: $startLocation,
            endLocation: $endLocation,
            dispatchType: $dispatchType,
            rateOfJob: $rateOfJob,
            companyId: $companyId,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN jt
        `;

        await neo4jService.runQuery(query, {
          id: jobType.jobTypeId,
          title: jobType.title,
          startLocation: jobType.startLocation,
          endLocation: jobType.endLocation,
          dispatchType: jobType.dispatchType,
          rateOfJob: jobType.rateOfJob,
          companyId: jobType.companyId,
          createdAt: this.formatDateForNeo4j(jobType.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(jobType.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated JobType: ${jobType.title}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate JobType ${jobType.title}:`, error);
      }
    }

    console.log(`📋 JobTypes migration completed: ${jobTypes.length} job types`);
  }

  private async migrateJobs() {
    console.log('\n💼 Migrating Jobs...');
    
    const jobs = await this.runQuery<SQLiteJob>(`
      SELECT * FROM Job ORDER BY createdAt
    `);

    for (const job of jobs) {
      try {
        const query = `
          CREATE (j:Job {
            id: $id,
            jobDate: $jobDate,
            jobGrossAmount: $jobGrossAmount,
            invoiceStatus: $invoiceStatus,
            weight: $weight,
            loads: $loads,
            startTime: $startTime,
            endTime: $endTime,
            ticketIds: $ticketIds,
            paymentReceived: $paymentReceived,
            driverPaid: $driverPaid,
            imageUrls: $imageUrls,
            jobTypeId: $jobTypeId,
            driverId: $driverId,
            dispatcherId: $dispatcherId,
            unitId: $unitId,
            invoiceId: $invoiceId,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN j
        `;

        await neo4jService.runQuery(query, {
          id: job.jobId,
          jobDate: this.formatDateForNeo4j(job.jobDate, 'date'),
          jobGrossAmount: job.jobGrossAmount,
          invoiceStatus: job.invoiceStatus,
          weight: job.weight,
          loads: job.loads,
          startTime: this.formatDateForNeo4j(job.startTime, 'time'),
          endTime: this.formatDateForNeo4j(job.endTime, 'time'),
          ticketIds: job.ticketIds,
          paymentReceived: job.paymentReceived,
          driverPaid: job.driverPaid,
          imageUrls: job.imageUrls,
          jobTypeId: job.jobTypeId,
          driverId: job.driverId,
          dispatcherId: job.dispatcherId,
          unitId: job.unitId,
          invoiceId: job.invoiceId,
          createdAt: this.formatDateForNeo4j(job.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(job.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated Job: ${job.jobDate} - ${job.jobGrossAmount || 'N/A'}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate Job ${job.jobId}:`, error);
      }
    }

    console.log(`💼 Jobs migration completed: ${jobs.length} jobs`);
  }

  private async migrateInvoices() {
    console.log('\n🧾 Migrating Invoices...');
    
    const invoices = await this.runQuery<SQLiteInvoice>(`
      SELECT * FROM Invoice ORDER BY createdAt
    `);

    for (const invoice of invoices) {
      try {
        const query = `
          CREATE (i:Invoice {
            id: $id,
            dispatcherId: $dispatcherId,
            invoiceNumber: $invoiceNumber,
            invoiceDate: $invoiceDate,
            status: $status,
            subTotal: $subTotal,
            dispatchPercent: $dispatchPercent,
            commission: $commission,
            hst: $hst,
            total: $total,
            billedTo: $billedTo,
            billedEmail: $billedEmail,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN i
        `;

        await neo4jService.runQuery(query, {
          id: invoice.invoiceId,
          dispatcherId: invoice.dispatcherId,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: this.formatDateForNeo4j(invoice.invoiceDate, 'date'),
          status: invoice.status,
          subTotal: invoice.subTotal,
          dispatchPercent: invoice.dispatchPercent,
          commission: invoice.commission,
          hst: invoice.hst,
          total: invoice.total,
          billedTo: invoice.billedTo,
          billedEmail: invoice.billedEmail,
          createdAt: this.formatDateForNeo4j(invoice.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(invoice.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated Invoice: ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate Invoice ${invoice.invoiceNumber}:`, error);
      }
    }

    console.log(`🧾 Invoices migration completed: ${invoices.length} invoices`);
  }

  private async migrateInvoiceLines() {
    console.log('\n📄 Migrating InvoiceLines...');
    
    const invoiceLines = await this.runQuery<SQLiteInvoiceLine>(`
      SELECT * FROM InvoiceLine ORDER BY createdAt
    `);

    for (const line of invoiceLines) {
      try {
        const query = `
          CREATE (il:InvoiceLine {
            id: $id,
            invoiceId: $invoiceId,
            jobId: $jobId,
            lineAmount: $lineAmount,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN il
        `;

        await neo4jService.runQuery(query, {
          id: line.invoiceLineId,
          invoiceId: line.invoiceId,
          jobId: line.jobId,
          lineAmount: line.lineAmount,
          createdAt: this.formatDateForNeo4j(line.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(line.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated InvoiceLine: ${line.lineAmount}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate InvoiceLine ${line.invoiceLineId}:`, error);
      }
    }

    console.log(`📄 InvoiceLines migration completed: ${invoiceLines.length} lines`);
  }

  private async migrateDriverRates() {
    console.log('\n💰 Migrating DriverRates...');
    
    const driverRates = await this.runQuery<SQLiteDriverRate>(`
      SELECT * FROM DriverRate ORDER BY createdAt
    `);

    if (driverRates.length === 0) {
      console.log('📄 No DriverRates to migrate');
      return;
    }

    for (const rate of driverRates) {
      try {
        const query = `
          CREATE (dr:DriverRate {
            id: $id,
            driverId: $driverId,
            jobTypeId: $jobTypeId,
            hourlyRate: $hourlyRate,
            percentageRate: $percentageRate,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          RETURN dr
        `;

        await neo4jService.runQuery(query, {
          id: rate.driverRateId,
          driverId: rate.driverId,
          jobTypeId: rate.jobTypeId,
          hourlyRate: rate.hourlyRate,
          percentageRate: rate.percentageRate,
          createdAt: this.formatDateForNeo4j(rate.createdAt, 'datetime'),
          updatedAt: this.formatDateForNeo4j(rate.updatedAt, 'datetime'),
        });

        console.log(`  ✅ Migrated DriverRate: ${rate.hourlyRate || rate.percentageRate}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate DriverRate ${rate.driverRateId}:`, error);
      }
    }

    console.log(`💰 DriverRates migration completed: ${driverRates.length} rates`);
  }

  private async createRelationships() {
    console.log('\n🔗 Creating Neo4j relationships...');

    // Company -> JobType relationships
    await neo4jService.runQuery(`
      MATCH (c:Company), (jt:JobType)
      WHERE c.id = jt.companyId AND jt.companyId IS NOT NULL
      CREATE (c)-[:HAS_JOB_TYPE]->(jt)
    `);
    console.log('  ✅ Created Company -> JobType relationships');

    // Job -> JobType relationships
    await neo4jService.runQuery(`
      MATCH (j:Job), (jt:JobType)
      WHERE j.jobTypeId = jt.id AND j.jobTypeId IS NOT NULL
      CREATE (j)-[:OF_TYPE]->(jt)
    `);
    console.log('  ✅ Created Job -> JobType relationships');

    // Job -> Driver relationships
    await neo4jService.runQuery(`
      MATCH (j:Job), (d:Driver)
      WHERE j.driverId = d.id AND j.driverId IS NOT NULL
      CREATE (j)-[:ASSIGNED_TO]->(d)
    `);
    console.log('  ✅ Created Job -> Driver relationships');

    // Job -> Dispatcher relationships
    await neo4jService.runQuery(`
      MATCH (j:Job), (d:Dispatcher)
      WHERE j.dispatcherId = d.id AND j.dispatcherId IS NOT NULL
      CREATE (j)-[:MANAGED_BY]->(d)
    `);
    console.log('  ✅ Created Job -> Dispatcher relationships');

    // Job -> Unit relationships
    await neo4jService.runQuery(`
      MATCH (j:Job), (u:Unit)
      WHERE j.unitId = u.id AND j.unitId IS NOT NULL
      CREATE (j)-[:USES_UNIT]->(u)
    `);
    console.log('  ✅ Created Job -> Unit relationships');

    // Invoice -> Dispatcher relationships
    await neo4jService.runQuery(`
      MATCH (i:Invoice), (d:Dispatcher)
      WHERE i.dispatcherId = d.id
      CREATE (i)-[:BILLED_BY]->(d)
    `);
    console.log('  ✅ Created Invoice -> Dispatcher relationships');

    // Job -> Invoice relationships (via InvoiceLine)
    await neo4jService.runQuery(`
      MATCH (j:Job), (i:Invoice), (il:InvoiceLine)
      WHERE il.jobId = j.id AND il.invoiceId = i.id
      CREATE (j)-[:INVOICED_IN]->(i)
    `);
    console.log('  ✅ Created Job -> Invoice relationships');

    // InvoiceLine -> Job relationships
    await neo4jService.runQuery(`
      MATCH (il:InvoiceLine), (j:Job)
      WHERE il.jobId = j.id
      CREATE (il)-[:FOR_JOB]->(j)
    `);
    console.log('  ✅ Created InvoiceLine -> Job relationships');

    // InvoiceLine -> Invoice relationships
    await neo4jService.runQuery(`
      MATCH (il:InvoiceLine), (i:Invoice)
      WHERE il.invoiceId = i.id
      CREATE (il)-[:PART_OF]->(i)
    `);
    console.log('  ✅ Created InvoiceLine -> Invoice relationships');

    // DriverRate relationships (if any exist)
    await neo4jService.runQuery(`
      MATCH (dr:DriverRate), (d:Driver)
      WHERE dr.driverId = d.id
      CREATE (dr)-[:RATE_FOR]->(d)
    `);
    
    await neo4jService.runQuery(`
      MATCH (dr:DriverRate), (jt:JobType)
      WHERE dr.jobTypeId = jt.id
      CREATE (dr)-[:APPLIES_TO]->(jt)
    `);
    console.log('  ✅ Created DriverRate relationships');

    console.log('🔗 All relationships created successfully!');
  }
}

async function runComprehensiveMigration() {
  const migrator = new ComprehensiveDataMigrator();
  await migrator.migrateAll();
}

if (require.main === module) {
  runComprehensiveMigration()
    .then(() => {
      console.log('\n✨ Comprehensive migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Comprehensive migration failed:', error);
      process.exit(1);
    });
}

export { runComprehensiveMigration };
