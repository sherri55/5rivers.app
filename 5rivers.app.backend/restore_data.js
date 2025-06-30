const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreData() {
  try {
    console.log('Starting data restoration...');
    
    // Read the backup file
    const backupPath = path.join(__dirname, 'backups', 'backup_2025-06-27T22-30-27-824Z.json');
    
    if (!fs.existsSync(backupPath)) {
      console.error('Backup file not found:', backupPath);
      return;
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('Backup data loaded successfully');
    
    // Clear existing data (in reverse dependency order)
    console.log('Clearing existing data...');
    await prisma.invoiceLine.deleteMany();
    await prisma.driverRate.deleteMany();
    await prisma.job.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.jobType.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.dispatcher.deleteMany();
    await prisma.company.deleteMany();
    // Don't delete users as they contain auth data
    
    console.log('Existing data cleared');
    
    // Restore data (in dependency order)
    
    // Companies
    if (backupData.companies && backupData.companies.length > 0) {
      console.log(`Restoring ${backupData.companies.length} companies...`);
      for (const company of backupData.companies) {
        await prisma.company.create({ data: company });
      }
    }
    
    // Dispatchers
    if (backupData.dispatchers && backupData.dispatchers.length > 0) {
      console.log(`Restoring ${backupData.dispatchers.length} dispatchers...`);
      for (const dispatcher of backupData.dispatchers) {
        await prisma.dispatcher.create({ data: dispatcher });
      }
    }
    
    // Drivers
    if (backupData.drivers && backupData.drivers.length > 0) {
      console.log(`Restoring ${backupData.drivers.length} drivers...`);
      for (const driver of backupData.drivers) {
        await prisma.driver.create({ data: driver });
      }
    }
    
    // Units
    if (backupData.units && backupData.units.length > 0) {
      console.log(`Restoring ${backupData.units.length} units...`);
      for (const unit of backupData.units) {
        await prisma.unit.create({ data: unit });
      }
    }
    
    // Job Types
    if (backupData.jobTypes && backupData.jobTypes.length > 0) {
      console.log(`Restoring ${backupData.jobTypes.length} job types...`);
      for (const jobType of backupData.jobTypes) {
        await prisma.jobType.create({ data: jobType });
      }
    }
    
    // Jobs (with default driverPaid = false for existing jobs)
    if (backupData.jobs && backupData.jobs.length > 0) {
      console.log(`Restoring ${backupData.jobs.length} jobs...`);
      
      // Get valid IDs for foreign key validation
      const validDriverIds = new Set((await prisma.driver.findMany({ select: { driverId: true } })).map(d => d.driverId));
      const validDispatcherIds = new Set((await prisma.dispatcher.findMany({ select: { dispatcherId: true } })).map(d => d.dispatcherId));
      const validUnitIds = new Set((await prisma.unit.findMany({ select: { unitId: true } })).map(u => u.unitId));
      const validJobTypeIds = new Set((await prisma.jobType.findMany({ select: { jobTypeId: true } })).map(jt => jt.jobTypeId));
      
      let skippedJobs = 0;
      for (const job of backupData.jobs) {
        // Validate foreign keys and clean up invalid ones
        const cleanJob = {
          ...job,
          driverPaid: job.driverPaid || false,
          driverId: validDriverIds.has(job.driverId) ? job.driverId : null,
          dispatcherId: job.dispatcherId && validDispatcherIds.has(job.dispatcherId) ? job.dispatcherId : null,
          unitId: job.unitId && validUnitIds.has(job.unitId) ? job.unitId : null,
          jobTypeId: job.jobTypeId && validJobTypeIds.has(job.jobTypeId) ? job.jobTypeId : null,
          invoiceId: null // Clear invoice references for now
        };
        
        // Skip jobs that don't have required fields
        if (!cleanJob.driverId) {
          skippedJobs++;
          console.log(`Skipping job ${job.jobId} - invalid driver reference`);
          continue;
        }
        
        try {
          await prisma.job.create({ data: cleanJob });
        } catch (error) {
          console.log(`Error creating job ${job.jobId}:`, error.message);
          skippedJobs++;
        }
      }
      
      if (skippedJobs > 0) {
        console.log(`Skipped ${skippedJobs} jobs due to invalid references`);
      }
    }
    
    // Invoices
    if (backupData.invoices && backupData.invoices.length > 0) {
      console.log(`Restoring ${backupData.invoices.length} invoices...`);
      for (const invoice of backupData.invoices) {
        await prisma.invoice.create({ data: invoice });
      }
    }
    
    // Driver Rates
    if (backupData.driverRates && backupData.driverRates.length > 0) {
      console.log(`Restoring ${backupData.driverRates.length} driver rates...`);
      for (const driverRate of backupData.driverRates) {
        await prisma.driverRate.create({ data: driverRate });
      }
    }
    
    // Invoice Lines
    if (backupData.invoiceLines && backupData.invoiceLines.length > 0) {
      console.log(`Restoring ${backupData.invoiceLines.length} invoice lines...`);
      for (const invoiceLine of backupData.invoiceLines) {
        await prisma.invoiceLine.create({ data: invoiceLine });
      }
    }
    
    console.log('Data restoration completed successfully!');
    
    // Print summary
    const counts = await Promise.all([
      prisma.company.count(),
      prisma.dispatcher.count(),
      prisma.driver.count(),
      prisma.unit.count(),
      prisma.jobType.count(),
      prisma.job.count(),
      prisma.invoice.count(),
      prisma.driverRate.count(),
      prisma.invoiceLine.count()
    ]);
    
    console.log('\nRestored data summary:');
    console.log(`- Companies: ${counts[0]}`);
    console.log(`- Dispatchers: ${counts[1]}`);
    console.log(`- Drivers: ${counts[2]}`);
    console.log(`- Units: ${counts[3]}`);
    console.log(`- Job Types: ${counts[4]}`);
    console.log(`- Jobs: ${counts[5]}`);
    console.log(`- Invoices: ${counts[6]}`);
    console.log(`- Driver Rates: ${counts[7]}`);
    console.log(`- Invoice Lines: ${counts[8]}`);
    
  } catch (error) {
    console.error('Error during data restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreData();
