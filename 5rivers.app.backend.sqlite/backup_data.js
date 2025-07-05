const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backupData() {
  try {
    console.log('Starting database backup...');
    
    const backup = {
      timestamp: new Date().toISOString(),
      companies: await prisma.company.findMany(),
      dispatchers: await prisma.dispatcher.findMany(),
      drivers: await prisma.driver.findMany(),
      units: await prisma.unit.findMany(),
      jobTypes: await prisma.jobType.findMany(),
      jobs: await prisma.job.findMany(),
      invoices: await prisma.invoice.findMany(),
      driverRates: await prisma.driverRate.findMany(),
      users: await prisma.user.findMany(),
    };

    const backupFileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupPath = `./backups/${backupFileName}`;
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups');
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`Backup completed successfully: ${backupPath}`);
    console.log('Backup summary:');
    console.log(`- Companies: ${backup.companies.length}`);
    console.log(`- Dispatchers: ${backup.dispatchers.length}`);
    console.log(`- Drivers: ${backup.drivers.length}`);
    console.log(`- Units: ${backup.units.length}`);
    console.log(`- Job Types: ${backup.jobTypes.length}`);
    console.log(`- Jobs: ${backup.jobs.length}`);
    console.log(`- Invoices: ${backup.invoices.length}`);
    console.log(`- Driver Rates: ${backup.driverRates.length}`);
    console.log(`- Users: ${backup.users.length}`);
    
  } catch (error) {
    console.error('Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupData();
