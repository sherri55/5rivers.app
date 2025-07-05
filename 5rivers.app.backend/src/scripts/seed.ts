import { companyService } from '../services/companyService';
import { neo4jService } from '../database/neo4j';

const sampleCompanies = [
  {
    name: "TechCorp Solutions",
    description: "Leading provider of enterprise software solutions",
    website: "https://techcorp.com",
    industry: "Technology",
    location: "San Francisco, CA",
    size: "501-1000",
    founded: 2010,
    logo: "https://example.com/techcorp-logo.png"
  },
  {
    name: "Green Energy Innovations",
    description: "Renewable energy and sustainability consulting",
    website: "https://greenenergy.com",
    industry: "Energy",
    location: "Austin, TX",
    size: "51-200",
    founded: 2015,
    logo: "https://example.com/green-energy-logo.png"
  },
  {
    name: "HealthTech Medical",
    description: "Medical device manufacturing and healthcare technology",
    website: "https://healthtech.com",
    industry: "Healthcare",
    location: "Boston, MA",
    size: "201-500",
    founded: 2008,
    logo: "https://example.com/healthtech-logo.png"
  },
  {
    name: "FinanceFlow Inc",
    description: "Financial services and investment management",
    website: "https://financeflow.com",
    industry: "Finance",
    location: "New York, NY",
    size: "1001-5000",
    founded: 1995,
    logo: "https://example.com/financeflow-logo.png"
  },
  {
    name: "EduLearn Platform",
    description: "Online education and e-learning solutions",
    website: "https://edulearn.com",
    industry: "Education",
    location: "Seattle, WA",
    size: "11-50",
    founded: 2018,
    logo: "https://example.com/edulearn-logo.png"
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Verify connection
    const isConnected = await neo4jService.verifyConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Neo4j database');
    }

    // Clear existing data (optional - remove in production)
    console.log('🧹 Clearing existing companies...');
    await neo4jService.runQuery('MATCH (c:Company) DELETE c');

    // Create indexes
    console.log('📊 Creating indexes...');
    await companyService.createIndexes();

    // Seed companies
    console.log('🏢 Creating sample companies...');
    for (const companyData of sampleCompanies) {
      const company = await companyService.createCompany(companyData);
      console.log(`✅ Created company: ${company.name}`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log(`📈 Created ${sampleCompanies.length} companies`);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await neo4jService.close();
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding process failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
