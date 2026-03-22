export interface Company {
  id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  founded?: number;
  logo?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyInput {
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  founded?: number;
  logo?: string;
  email?: string;
  phone?: string;
}

export interface UpdateCompanyInput {
  id: string;
  name?: string;
  description?: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  founded?: number;
  logo?: string;
  email?: string;
  phone?: string;
}

export interface CompanyFilters {
  industry?: string;
  location?: string;
  size?: string;
  minFounded?: number;
  maxFounded?: number;
  search?: string;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface CompanyConnection {
  nodes: Company[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
