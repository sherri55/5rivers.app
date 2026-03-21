/**
 * Populate the demo organization with realistic test data.
 * Run: npx ts-node scripts/seed-test-data.ts
 *
 * Prerequisites: run seed-sample-user.ts first (npm run db:seed)
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { v4 as uuid } from 'uuid';
import { getPool, closePool, query } from '../src/db/connection';

const DEMO_ORG_SLUG = 'demo';

async function main() {
  await getPool();

  // Find demo org
  const orgs = await query<Array<{ id: string }>>(
    `SELECT id FROM Organizations WHERE slug = @slug`,
    { params: { slug: DEMO_ORG_SLUG } }
  );
  if (!orgs.length) {
    console.error('Demo org not found. Run npm run db:seed first.');
    process.exit(1);
  }
  const orgId = orgs[0].id;

  // Clear existing data for this org (in FK order)
  console.log('Clearing existing data...');
  await query(`DELETE FROM JobDriverPay WHERE jobId IN (SELECT id FROM Jobs WHERE organizationId = @orgId)`, { params: { orgId } });
  await query(`DELETE FROM JobInvoice WHERE jobId IN (SELECT id FROM Jobs WHERE organizationId = @orgId)`, { params: { orgId } });
  await query(`DELETE FROM Images WHERE jobId IN (SELECT id FROM Jobs WHERE organizationId = @orgId)`, { params: { orgId } });
  await query(`DELETE FROM Jobs WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM Invoices WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM DriverPayment WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM CarrierPayments WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM UnitEvents WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM DriverJobTypeRate WHERE driverId IN (SELECT id FROM Drivers WHERE organizationId = @orgId)`, { params: { orgId } });
  await query(`DELETE FROM JobTypes WHERE companyId IN (SELECT id FROM Companies WHERE organizationId = @orgId)`, { params: { orgId } });
  await query(`DELETE FROM Companies WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM Drivers WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM Dispatchers WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM Units WHERE organizationId = @orgId`, { params: { orgId } });
  await query(`DELETE FROM Carriers WHERE organizationId = @orgId`, { params: { orgId } });

  const now = new Date();

  // ── Companies ──
  console.log('Seeding companies...');
  const companies = [
    { id: uuid(), name: 'Dufferin Construction', description: 'Road & highway construction', email: 'dispatch@dufferin.ca', phone: '905-555-0101', industry: 'Construction', location: 'Oakville, ON', website: 'dufferin.ca' },
    { id: uuid(), name: 'Lafarge Canada', description: 'Cement, aggregates & concrete', email: 'orders@lafarge.ca', phone: '416-555-0202', industry: 'Aggregates', location: 'Mississauga, ON', website: 'lafarge.ca' },
    { id: uuid(), name: 'Miller Paving', description: 'Asphalt & paving contractor', email: 'ops@millerpaving.com', phone: '905-555-0303', industry: 'Paving', location: 'Markham, ON', website: 'millerpaving.com' },
    { id: uuid(), name: 'Greenfield Excavation', description: 'Excavation & site grading', email: 'info@greenfield-ex.ca', phone: '647-555-0404', industry: 'Excavation', location: 'Brampton, ON', website: 'greenfield-ex.ca' },
    { id: uuid(), name: 'Ontario Aggregate Supply', description: 'Sand, gravel & crushed stone supplier', email: 'sales@ontarioagg.ca', phone: '905-555-0505', industry: 'Aggregates', location: 'Hamilton, ON', website: 'ontarioagg.ca' },
    { id: uuid(), name: 'Maple Concrete', description: 'Ready-mix concrete delivery', email: 'dispatch@mapleconcrete.ca', phone: '416-555-0606', industry: 'Concrete', location: 'Toronto, ON', website: 'mapleconcrete.ca' },
  ];
  for (const c of companies) {
    await query(
      `INSERT INTO Companies (id, organizationId, name, description, email, phone, industry, location, website, createdAt, updatedAt)
       VALUES (@id, @orgId, @name, @desc, @email, @phone, @industry, @location, @website, @now, @now)`,
      { params: { id: c.id, orgId, name: c.name, desc: c.description, email: c.email, phone: c.phone, industry: c.industry, location: c.location, website: c.website, now } }
    );
  }

  // ── Job Types ──
  console.log('Seeding job types...');
  const jobTypes = [
    // Dufferin
    { id: uuid(), companyId: companies[0].id, title: 'Gravel Haul - Hwy 401', startLocation: 'Milton Quarry', endLocation: 'Hwy 401 Expansion Site', dispatchType: 'tonnage', rate: 12.50 },
    { id: uuid(), companyId: companies[0].id, title: 'Sand Delivery - Oakville', startLocation: 'Burlington Pit', endLocation: 'Oakville Job Site', dispatchType: 'load', rate: 350 },
    { id: uuid(), companyId: companies[0].id, title: 'Equipment Transport', startLocation: 'Dufferin Yard', endLocation: 'Various', dispatchType: 'hourly', rate: 95 },
    // Lafarge
    { id: uuid(), companyId: companies[1].id, title: 'Concrete Delivery', startLocation: 'Lafarge Mississauga Plant', endLocation: 'Various Sites', dispatchType: 'load', rate: 425 },
    { id: uuid(), companyId: companies[1].id, title: 'Aggregate Haul - Brampton', startLocation: 'Caledon Quarry', endLocation: 'Brampton Distribution', dispatchType: 'tonnage', rate: 11.75 },
    // Miller
    { id: uuid(), companyId: companies[2].id, title: 'Asphalt Haul', startLocation: 'Miller Asphalt Plant', endLocation: 'Markham Resurfacing', dispatchType: 'tonnage', rate: 14.00 },
    { id: uuid(), companyId: companies[2].id, title: 'Milling Removal', startLocation: 'Markham Road Sites', endLocation: 'Recycling Depot', dispatchType: 'load', rate: 280 },
    // Greenfield
    { id: uuid(), companyId: companies[3].id, title: 'Dirt Removal', startLocation: 'Brampton Subdivision', endLocation: 'Fill Site - Caledon', dispatchType: 'load', rate: 300 },
    { id: uuid(), companyId: companies[3].id, title: 'Site Work - Hourly', startLocation: 'Brampton Subdivision', endLocation: 'On-site', dispatchType: 'hourly', rate: 110 },
    // Ontario Aggregate
    { id: uuid(), companyId: companies[4].id, title: 'Crushed Stone Delivery', startLocation: 'Hamilton Quarry', endLocation: 'Stoney Creek', dispatchType: 'tonnage', rate: 10.50 },
    // Maple Concrete
    { id: uuid(), companyId: companies[5].id, title: 'Ready-Mix Delivery', startLocation: 'Maple Concrete Plant', endLocation: 'Various GTA Sites', dispatchType: 'load', rate: 475 },
    { id: uuid(), companyId: companies[5].id, title: 'Pump Truck Service', startLocation: 'Maple Concrete Yard', endLocation: 'Various', dispatchType: 'fixed', rate: 1200 },
  ];
  for (const jt of jobTypes) {
    await query(
      `INSERT INTO JobTypes (id, companyId, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt)
       VALUES (@id, @companyId, @title, @startLoc, @endLoc, @dispatchType, @rate, @now, @now)`,
      { params: { id: jt.id, companyId: jt.companyId, title: jt.title, startLoc: jt.startLocation, endLoc: jt.endLocation, dispatchType: jt.dispatchType, rate: jt.rate, now } }
    );
  }

  // ── Drivers ──
  console.log('Seeding drivers...');
  const drivers = [
    { id: uuid(), name: 'Gurpreet Singh', email: 'gurpreet@5rivers.app', phone: '647-555-1001', payType: 'PERCENTAGE', hourlyRate: 0, percentageRate: 25 },
    { id: uuid(), name: 'Harjot Sidhu', email: 'harjot@5rivers.app', phone: '905-555-1002', payType: 'HOURLY', hourlyRate: 32, percentageRate: 0 },
    { id: uuid(), name: 'Manpreet Dhillon', email: 'manpreet@5rivers.app', phone: '416-555-1003', payType: 'PERCENTAGE', hourlyRate: 0, percentageRate: 28 },
    { id: uuid(), name: 'Jaspreet Gill', email: 'jaspreet@5rivers.app', phone: '647-555-1004', payType: 'HOURLY', hourlyRate: 35, percentageRate: 0 },
    { id: uuid(), name: 'Amrit Brar', email: 'amrit@5rivers.app', phone: '905-555-1005', payType: 'CUSTOM', hourlyRate: 30, percentageRate: 22 },
    { id: uuid(), name: 'Sukhman Grewal', email: 'sukhman@5rivers.app', phone: '416-555-1006', payType: 'PERCENTAGE', hourlyRate: 0, percentageRate: 26 },
    { id: uuid(), name: 'Rajveer Sandhu', email: 'rajveer@5rivers.app', phone: '647-555-1007', payType: 'HOURLY', hourlyRate: 34, percentageRate: 0 },
    { id: uuid(), name: 'Navdeep Aulakh', email: 'navdeep@5rivers.app', phone: '905-555-1008', payType: 'PERCENTAGE', hourlyRate: 0, percentageRate: 27 },
  ];
  for (const d of drivers) {
    await query(
      `INSERT INTO Drivers (id, organizationId, name, email, phone, payType, hourlyRate, percentageRate, createdAt, updatedAt)
       VALUES (@id, @orgId, @name, @email, @phone, @payType, @hourlyRate, @percentageRate, @now, @now)`,
      { params: { id: d.id, orgId, name: d.name, email: d.email, phone: d.phone, payType: d.payType, hourlyRate: d.hourlyRate, percentageRate: d.percentageRate, now } }
    );
  }

  // ── Dispatchers ──
  console.log('Seeding dispatchers...');
  const dispatchers = [
    { id: uuid(), name: 'Tony Rossi', email: 'tony@rossi-dispatch.ca', phone: '416-555-2001', commission: 10, description: 'GTA construction dispatch' },
    { id: uuid(), name: 'Mike Thompson', email: 'mike@thompsondispatch.ca', phone: '905-555-2002', commission: 8, description: 'Aggregate & paving specialist' },
    { id: uuid(), name: 'Sarah Chen', email: 'sarah@gta-logistics.ca', phone: '647-555-2003', commission: 12, description: 'Concrete & heavy haul dispatch' },
    { id: uuid(), name: 'Dave Wilson', email: 'dave@wilsonfreight.ca', phone: '905-555-2004', commission: 9, description: 'Highway construction dispatch' },
    { id: uuid(), name: 'Priya Sharma', email: 'priya@sharmalogistics.ca', phone: '416-555-2005', commission: 11, description: 'Excavation & demolition' },
  ];
  for (const d of dispatchers) {
    await query(
      `INSERT INTO Dispatchers (id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt)
       VALUES (@id, @orgId, @name, @desc, @email, @phone, @commission, @now, @now)`,
      { params: { id: d.id, orgId, name: d.name, desc: d.description, email: d.email, phone: d.phone, commission: d.commission, now } }
    );
  }

  // ── Units ──
  console.log('Seeding units...');
  const units = [
    { id: uuid(), name: 'Truck 101', plateNumber: 'BVRT 4521', vin: '1HGCG5655WA027984', status: 'ACTIVE', year: 2022, make: 'Kenworth', model: 'T880', mileage: 87000, color: 'White', insuranceExpiry: '2026-09-15', lastMaint: '2026-02-01', nextMaint: '2026-05-01' },
    { id: uuid(), name: 'Truck 102', plateNumber: 'CXMT 8834', vin: '3AKJHHDR5DSFE4532', status: 'ACTIVE', year: 2021, make: 'Freightliner', model: 'Cascadia', mileage: 112000, color: 'Blue', insuranceExpiry: '2026-11-20', lastMaint: '2026-01-15', nextMaint: '2026-04-15' },
    { id: uuid(), name: 'Truck 103', plateNumber: 'DNPL 2247', vin: '1XKYDP9X1MJ456789', status: 'ACTIVE', year: 2023, make: 'Peterbilt', model: '567', mileage: 45000, color: 'Red', insuranceExpiry: '2027-01-10', lastMaint: '2026-03-01', nextMaint: '2026-06-01' },
    { id: uuid(), name: 'Truck 104', plateNumber: 'ARKG 6612', vin: '2NKHHM6X87M123456', status: 'ACTIVE', year: 2020, make: 'Kenworth', model: 'W900', mileage: 156000, color: 'Black', insuranceExpiry: '2026-08-30', lastMaint: '2026-02-20', nextMaint: '2026-05-20' },
    { id: uuid(), name: 'Truck 105', plateNumber: 'FMWT 3389', vin: '1FUJHHCK69LAB7890', status: 'MAINTENANCE', year: 2019, make: 'Freightliner', model: '122SD', mileage: 198000, color: 'Silver', insuranceExpiry: '2026-07-15', lastMaint: '2026-03-10', nextMaint: '2026-04-10' },
    { id: uuid(), name: 'Truck 106', plateNumber: 'GPRS 1156', vin: '1XPBDP9X6PD654321', status: 'ACTIVE', year: 2024, make: 'Peterbilt', model: '389', mileage: 22000, color: 'Green', insuranceExpiry: '2027-03-01', lastMaint: '2026-03-15', nextMaint: '2026-06-15' },
    { id: uuid(), name: 'Trailer T-01', plateNumber: 'TRL 9001', vin: '1JJV532D8KL098765', status: 'ACTIVE', year: 2021, make: 'Manac', model: 'Dump Trailer', mileage: null, color: 'Grey', insuranceExpiry: '2026-10-01', lastMaint: '2026-01-20', nextMaint: '2026-07-20' },
    { id: uuid(), name: 'Trailer T-02', plateNumber: 'TRL 9002', vin: '1JJV532D8KL098766', status: 'RETIRED', year: 2015, make: 'Manac', model: 'Flatbed', mileage: null, color: 'Rust', insuranceExpiry: '2025-12-01', lastMaint: '2025-06-01', nextMaint: null },
  ];
  for (const u of units) {
    await query(
      `INSERT INTO Units (id, organizationId, name, plateNumber, vin, status, year, make, model, mileage, color, insuranceExpiry, lastMaintenanceDate, nextMaintenanceDate, createdAt, updatedAt)
       VALUES (@id, @orgId, @name, @plate, @vin, @status, @year, @make, @model, @mileage, @color, @insExp, @lastMaint, @nextMaint, @now, @now)`,
      { params: { id: u.id, orgId, name: u.name, plate: u.plateNumber, vin: u.vin, status: u.status, year: u.year, make: u.make, model: u.model, mileage: u.mileage, color: u.color, insExp: u.insuranceExpiry, lastMaint: u.lastMaint, nextMaint: u.nextMaint, now } }
    );
  }

  // ── Carriers ──
  console.log('Seeding carriers...');
  const carriers = [
    { id: uuid(), name: 'Northern Star Trucking', contactPerson: 'Bill Murray', email: 'bill@northernstar.ca', phone: '905-555-3001', rateType: 'PERCENTAGE', rate: 15, status: 'ACTIVE' },
    { id: uuid(), name: 'Trans-Ontario Haulage', contactPerson: 'Kevin Park', email: 'kevin@transontario.ca', phone: '416-555-3002', rateType: 'FLAT_PER_LOAD', rate: 275, status: 'ACTIVE' },
    { id: uuid(), name: 'Simcoe Express', contactPerson: 'Tom Hardy', email: 'tom@simcoeexpress.ca', phone: '705-555-3003', rateType: 'HOURLY', rate: 85, status: 'ACTIVE' },
    { id: uuid(), name: 'GTA Heavy Haul', contactPerson: 'Raj Patel', email: 'raj@gtaheavyhaul.ca', phone: '647-555-3004', rateType: 'FLAT_PER_TON', rate: 8.50, status: 'INACTIVE' },
  ];
  for (const c of carriers) {
    await query(
      `INSERT INTO Carriers (id, organizationId, name, contactPerson, email, phone, rateType, rate, status, createdAt, updatedAt)
       VALUES (@id, @orgId, @name, @contact, @email, @phone, @rateType, @rate, @status, @now, @now)`,
      { params: { id: c.id, orgId, name: c.name, contact: c.contactPerson, email: c.email, phone: c.phone, rateType: c.rateType, rate: c.rate, status: c.status, now } }
    );
  }

  // ── Jobs (spread over last 3 months) ──
  console.log('Seeding jobs...');
  const jobIds: string[] = [];
  const jobRecords: Array<{ id: string; driverId: string; dispatcherId: string | null; amount: number; driverPaid: boolean; jobDate: string }> = [];

  function randomDate(daysBack: number): string {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
    return d.toISOString().slice(0, 10);
  }
  function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

  for (let i = 0; i < 60; i++) {
    const jt = pick(jobTypes);
    const driver = pick(drivers);
    const dispatcher = Math.random() > 0.15 ? pick(dispatchers) : null;
    const unit = pick(units.filter(u => u.status === 'ACTIVE'));
    const carrier = Math.random() > 0.7 ? pick(carriers.filter(c => c.status === 'ACTIVE')) : null;
    const jobDate = randomDate(90);
    const sourceType = dispatcher ? 'DISPATCHED' : 'DIRECT';
    const driverPaid = Math.random() > 0.6;
    const id = uuid();

    let amount: number;
    let weight: string | null = null;
    let loads: number | null = null;
    let startTime: string | null = null;
    let endTime: string | null = null;

    switch (jt.dispatchType) {
      case 'tonnage':
        weight = String(rand(18, 42));
        amount = parseFloat(weight) * jt.rate;
        break;
      case 'load':
        loads = rand(1, 6);
        amount = loads * jt.rate;
        break;
      case 'hourly': {
        const startH = rand(6, 10);
        const endH = startH + rand(4, 10);
        startTime = `${String(startH).padStart(2, '0')}:00`;
        endTime = `${String(Math.min(endH, 23)).padStart(2, '0')}:00`;
        const hours = Math.min(endH, 23) - startH;
        amount = hours * jt.rate;
        break;
      }
      case 'fixed':
        amount = jt.rate;
        break;
      default:
        amount = jt.rate;
    }

    amount = Math.round(amount * 100) / 100;
    const carrierAmount = carrier ? Math.round(amount * 0.7 * 100) / 100 : null;
    const ticketIds = jt.dispatchType === 'tonnage' || jt.dispatchType === 'load'
      ? `T-${rand(10000, 99999)}`
      : null;

    await query(
      `INSERT INTO Jobs (id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, carrierId, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, driverPaid, createdAt, updatedAt)
       VALUES (@id, @orgId, @jobDate, @jobTypeId, @driverId, @dispatcherId, @unitId, @carrierId, @sourceType, @weight, @loads, @startTime, @endTime, @amount, @carrierAmount, @ticketIds, @driverPaid, @now, @now)`,
      { params: { id, orgId, jobDate, jobTypeId: jt.id, driverId: driver.id, dispatcherId: dispatcher?.id ?? null, unitId: unit.id, carrierId: carrier?.id ?? null, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, driverPaid: driverPaid ? 1 : 0, now } }
    );

    jobIds.push(id);
    jobRecords.push({ id, driverId: driver.id, dispatcherId: dispatcher?.id ?? null, amount, driverPaid, jobDate });
  }

  // ── JobDriverPay entries ──
  console.log('Seeding job driver pay...');
  for (const job of jobRecords) {
    const driver = drivers.find(d => d.id === job.driverId)!;
    let driverEarned: number;
    if (driver.payType === 'PERCENTAGE' || driver.payType === 'CUSTOM') {
      driverEarned = Math.round(job.amount * (driver.percentageRate / 100) * 100) / 100;
    } else {
      // For hourly, approximate
      driverEarned = Math.round(job.amount * 0.35 * 100) / 100;
    }
    await query(
      `INSERT INTO JobDriverPay (jobId, driverId, amount, paidAt, paymentId, createdAt)
       VALUES (@jobId, @driverId, @amount, @paidAt, NULL, @now)`,
      { params: { jobId: job.id, driverId: job.driverId, amount: driverEarned, paidAt: job.driverPaid ? new Date(job.jobDate) : null, now } }
    );
  }

  // ── Invoices ──
  console.log('Seeding invoices...');
  const invoices: Array<{ id: string; dispatcherId: string | null; status: string }> = [];
  const statuses: Array<'CREATED' | 'RAISED' | 'RECEIVED'> = ['CREATED', 'RAISED', 'RAISED', 'RAISED', 'RECEIVED', 'RECEIVED'];

  for (let i = 1; i <= 18; i++) {
    const id = uuid();
    const dispatcher = pick(dispatchers);
    const status = pick(statuses);
    const invoiceDate = randomDate(75);
    const invoiceNumber = `INV-${String(2026000 + i)}`;
    const billedTo = dispatcher.name;
    const billedEmail = dispatcher.email;

    await query(
      `INSERT INTO Invoices (id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, billedTo, billedEmail, createdAt, updatedAt)
       VALUES (@id, @orgId, @invoiceNumber, @invoiceDate, @status, @dispatcherId, @billedTo, @billedEmail, @now, @now)`,
      { params: { id, orgId, invoiceNumber, invoiceDate, status, dispatcherId: dispatcher.id, billedTo, billedEmail, now } }
    );
    invoices.push({ id, dispatcherId: dispatcher.id, status });
  }

  // ── JobInvoice (link jobs to invoices) ──
  console.log('Seeding job-invoice links...');
  const availableJobs = [...jobRecords];
  for (const inv of invoices) {
    // Pick 2-5 jobs for each invoice
    const count = rand(2, Math.min(5, availableJobs.length));
    for (let i = 0; i < count && availableJobs.length > 0; i++) {
      const idx = Math.floor(Math.random() * availableJobs.length);
      const job = availableJobs.splice(idx, 1)[0];
      await query(
        `INSERT INTO JobInvoice (jobId, invoiceId, amount, addedAt)
         VALUES (@jobId, @invoiceId, @amount, @now)`,
        { params: { jobId: job.id, invoiceId: inv.id, amount: job.amount, now } }
      );
    }
  }

  // ── Driver Payments ──
  console.log('Seeding driver payments...');
  for (const driver of drivers) {
    const numPayments = rand(1, 3);
    for (let i = 0; i < numPayments; i++) {
      const paymentDate = randomDate(60);
      const amount = rand(500, 3000);
      const methods = ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER'];
      await query(
        `INSERT INTO DriverPayment (id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt)
         VALUES (@id, @driverId, @orgId, @amount, @paidAt, @method, @ref, @notes, @now, @now)`,
        { params: { id: uuid(), driverId: driver.id, orgId, amount, paidAt: paymentDate, method: pick(methods), ref: `PAY-${rand(1000, 9999)}`, notes: null, now } }
      );
    }
  }

  console.log('\nTest data seeded successfully!');
  console.log(`  ${companies.length} companies`);
  console.log(`  ${jobTypes.length} job types`);
  console.log(`  ${drivers.length} drivers`);
  console.log(`  ${dispatchers.length} dispatchers`);
  console.log(`  ${units.length} units`);
  console.log(`  ${carriers.length} carriers`);
  console.log(`  ${jobRecords.length} jobs`);
  console.log(`  ${invoices.length} invoices`);
  console.log(`  ${drivers.length * 2} driver payments (approx)`);
}

main()
  .then(() => closePool())
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
