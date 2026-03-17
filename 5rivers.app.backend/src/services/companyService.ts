import { v4 as uuidv4 } from 'uuid';
import { neo4jService } from '../database/neo4j';
import neo4j from 'neo4j-driver';
import {
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyFilters,
  PaginationInput,
  CompanyConnection,
} from '../types/company';

export class CompanyService {
  
  async getCompanies(
    filters?: CompanyFilters,
    pagination?: PaginationInput
  ): Promise<CompanyConnection> {
    const page = Math.max(1, Math.floor(pagination?.page || 1));
    const limit = Math.max(1, Math.floor(pagination?.limit || 10));
    const offset = Math.max(0, Math.floor(pagination?.offset || (page - 1) * limit));

    // Build the WHERE clause dynamically
    const whereConditions: string[] = [];
    const parameters: Record<string, any> = { limit, offset };

    if (filters?.industry) {
      whereConditions.push('toLower(c.industry) CONTAINS toLower($industry)');
      parameters.industry = filters.industry;
    }

    if (filters?.location) {
      whereConditions.push('toLower(c.location) CONTAINS toLower($location)');
      parameters.location = filters.location;
    }

    if (filters?.size) {
      whereConditions.push('c.size = $size');
      parameters.size = filters.size;
    }

    if (filters?.minFounded) {
      whereConditions.push('c.founded >= $minFounded');
      parameters.minFounded = filters.minFounded;
    }

    if (filters?.maxFounded) {
      whereConditions.push('c.founded <= $maxFounded');
      parameters.maxFounded = filters.maxFounded;
    }

    if (filters?.search) {
      whereConditions.push(`
        (toLower(c.name) CONTAINS toLower($search) OR 
         toLower(c.description) CONTAINS toLower($search))
      `);
      parameters.search = filters.search;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get companies with pagination
    const companiesQuery = `
      MATCH (c:Company)
      ${whereClause}
      RETURN c
      ORDER BY c.name ASC
      SKIP $offset LIMIT $limit
    `;

    // Get total count
    const countQuery = `
      MATCH (c:Company)
      ${whereClause}
      RETURN count(c) as totalCount
    `;

    // Ensure all numeric parameters are integers for Neo4j  
    const queryParameters = {
      ...parameters,
      limit: neo4j.int(Math.floor(limit)),
      offset: neo4j.int(Math.floor(offset))
    };

    const [companiesResult, countResult] = await Promise.all([
      neo4jService.runQuery(companiesQuery, queryParameters),
      neo4jService.runQuery(countQuery, queryParameters),
    ]);

    const companies: Company[] = companiesResult.map((record: any) => ({
      ...record.c.properties,
      createdAt: new Date(record.c.properties.createdAt),
      updatedAt: new Date(record.c.properties.updatedAt),
    }));

    const totalCount = countResult[0]?.totalCount || 0;
    const hasNextPage = offset + limit < totalCount;
    const hasPreviousPage = offset > 0;

    return {
      nodes: companies,
      totalCount,
      hasNextPage,
      hasPreviousPage,
    };
  }

  async getCompanyById(id: string): Promise<Company | null> {
    const query = `
      MATCH (c:Company {id: $id})
      RETURN c
    `;

    const result = await neo4jService.runQuery(query, { id });
    
    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0].c.properties,
      createdAt: new Date(result[0].c.properties.createdAt),
      updatedAt: new Date(result[0].c.properties.updatedAt),
    };
  }

  async searchCompanies(searchQuery: string, limit: number = 10): Promise<Company[]> {
    const query = `
      MATCH (c:Company)
      WHERE toLower(c.name) CONTAINS toLower($search) OR 
            toLower(c.description) CONTAINS toLower($search) OR
            toLower(c.industry) CONTAINS toLower($search)
      RETURN c
      ORDER BY c.name ASC
      LIMIT $limit
    `;

    const result = await neo4jService.runQuery(query, { 
      search: searchQuery, 
      limit 
    });

    return result.map((record: any) => ({
      ...record.c.properties,
      createdAt: new Date(record.c.properties.createdAt),
      updatedAt: new Date(record.c.properties.updatedAt),
    }));
  }

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const id = uuidv4();
    const now = new Date().toISOString();

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

    const parameters = {
      id,
      name: input.name,
      description: input.description || null,
      website: input.website || null,
      industry: input.industry || null,
      location: input.location || null,
      size: input.size || null,
      founded: input.founded || null,
      logo: input.logo || null,
      email: input.email || null,
      phone: input.phone || null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await neo4jService.runQuery(query, parameters);

    return {
      ...result[0].c.properties,
      createdAt: new Date(result[0].c.properties.createdAt),
      updatedAt: new Date(result[0].c.properties.updatedAt),
    };
  }

  async updateCompany(input: UpdateCompanyInput): Promise<Company | null> {
    const existingCompany = await this.getCompanyById(input.id);
    if (!existingCompany) {
      return null;
    }

    const updateFields: string[] = [];
    const parameters: Record<string, any> = { 
      id: input.id, 
      updatedAt: new Date().toISOString() 
    };

    // Build SET clause dynamically
    const fieldsToUpdate = ['name', 'description', 'website', 'industry', 'location', 'size', 'founded', 'logo', 'email', 'phone'];
    
    fieldsToUpdate.forEach(field => {
      if (input[field as keyof UpdateCompanyInput] !== undefined) {
        updateFields.push(`c.${field} = $${field}`);
        parameters[field] = input[field as keyof UpdateCompanyInput];
      }
    });

    updateFields.push('c.updatedAt = $updatedAt');

    const query = `
      MATCH (c:Company {id: $id})
      SET ${updateFields.join(', ')}
      RETURN c
    `;

    const result = await neo4jService.runQuery(query, parameters);

    return {
      ...result[0].c.properties,
      createdAt: new Date(result[0].c.properties.createdAt),
      updatedAt: new Date(result[0].c.properties.updatedAt),
    };
  }

  async deleteCompany(id: string): Promise<boolean> {
    const query = `
      MATCH (c:Company {id: $id})
      DELETE c
      RETURN count(c) as deletedCount
    `;

    const result = await neo4jService.runQuery(query, { id });
    return result[0]?.deletedCount > 0;
  }

  // Method to create indexes for better performance
  async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX company_id_index IF NOT EXISTS FOR (c:Company) ON (c.id)',
      'CREATE INDEX company_name_index IF NOT EXISTS FOR (c:Company) ON (c.name)',
      'CREATE INDEX company_industry_index IF NOT EXISTS FOR (c:Company) ON (c.industry)',
      'CREATE INDEX company_location_index IF NOT EXISTS FOR (c:Company) ON (c.location)',
    ];

    for (const indexQuery of indexes) {
      try {
        await neo4jService.runQuery(indexQuery);
        console.log(`Created index: ${indexQuery}`);
      } catch (error) {
        console.warn(`Index creation warning: ${error}`);
      }
    }
  }
}

export const companyService = new CompanyService();
