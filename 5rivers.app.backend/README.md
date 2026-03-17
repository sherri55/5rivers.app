# 5Rivers.app Backend

A modern GraphQL API built with Apollo Server, TypeScript, and Neo4j for the 5Rivers.app application.

## Features

- 🔥 **Neo4j Database**: Graph database for complex relationships
- 🚀 **GraphQL API**: Efficient data fetching with Apollo Server
- 📝 **TypeScript**: Full type safety
- 🔄 **Hot Reload**: Development server with automatic restart
- 🧪 **Testing**: Jest testing framework
- 📊 **Scalars**: Custom date/time handling

## Quick Start

### Prerequisites

- Node.js 18+ 
- Neo4j Database (local or cloud)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd 5rivers.app.backend
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:

### Environment Variables

The application uses the following environment variables:

#### Server Configuration
```env
PORT=4001                        # Server port (default: 4001)
NODE_ENV=development             # Environment: development|production|test
```

#### CORS Configuration
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### Neo4j Database
```env
NEO4J_URI=neo4j://localhost:7687  # Neo4j connection string
NEO4J_USERNAME=neo4j             # Database username
NEO4J_PASSWORD=your_password     # Database password
NEO4J_DATABASE=neo4j             # Database name
```

#### GraphQL Configuration
```env
GRAPHQL_INTROSPECTION=true       # Enable GraphQL introspection (default: true in dev)
GRAPHQL_PLAYGROUND=true          # Enable GraphQL playground (default: true in dev)
GRAPHQL_CORS=true               # Enable CORS for GraphQL (default: true)
```

#### Security Settings
```env
BCRYPT_ROUNDS=12                # Password hashing rounds (default: 12)
```

#### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000     # Rate limit window in ms (default: 15 minutes)
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window (default: 100)
```

#### Logging
```env
LOG_LEVEL=info                  # Logging level: error|warn|info|debug
```

All variables have sensible defaults, so you only need to set the ones you want to customize.

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## GraphQL Endpoints

- **GraphQL Playground**: `http://localhost:4000/`
- **GraphQL Endpoint**: `http://localhost:4000/graphql`

## API Schema

### Company Operations

#### Queries
```graphql
# Get paginated companies with filters
companies(
  filters: CompanyFilters
  pagination: PaginationInput
): CompanyConnection!

# Get single company by ID
company(id: ID!): Company

# Search companies
searchCompanies(query: String!, limit: Int = 10): [Company!]!
```

#### Mutations
```graphql
# Create new company
createCompany(input: CreateCompanyInput!): Company!

# Update existing company
updateCompany(input: UpdateCompanyInput!): Company!

# Delete company
deleteCompany(id: ID!): Boolean!
```

### Example Queries

**Get all companies with pagination:**
```graphql
query GetCompanies {
  companies(
    pagination: { page: 1, limit: 10 }
    filters: { industry: "Technology" }
  ) {
    nodes {
      id
      name
      description
      website
      industry
      location
    }
    totalCount
    hasNextPage
  }
}
```

**Create a new company:**
```graphql
mutation CreateCompany {
  createCompany(input: {
    name: "Acme Corp"
    description: "A technology company"
    industry: "Technology"
    location: "San Francisco, CA"
    website: "https://acme.com"
  }) {
    id
    name
    createdAt
  }
}
```

## Database Schema

### Neo4j Node: Company
```
(:Company {
  id: String,
  name: String,
  description: String,
  website: String,
  industry: String,
  location: String,
  size: String,
  founded: Integer,
  logo: String,
  createdAt: DateTime,
  updatedAt: DateTime
})
```

## Project Structure

```
src/
├── config.ts              # Configuration management
├── index.ts               # Server entry point
├── database/
│   └── neo4j.ts           # Neo4j connection & utilities
├── schema/
│   ├── typeDefs.ts        # GraphQL type definitions
│   └── resolvers.ts       # GraphQL resolvers
├── services/
│   └── companyService.ts  # Business logic for companies
└── types/
    ├── company.ts         # Company type definitions
    └── context.ts         # GraphQL context type
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEO4J_URI` | Neo4j connection URI | `neo4j://localhost:7687` |
| `NEO4J_USERNAME` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `password` |
| `NEO4J_DATABASE` | Neo4j database name | `neo4j` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

## Performance Considerations

- **Indexing**: Automatically creates indexes on startup for better query performance
- **Connection Pooling**: Neo4j driver handles connection pooling
- **Pagination**: All list queries support pagination to avoid large result sets
- **Search Optimization**: Text search uses case-insensitive contains queries

## Error Handling

The API includes comprehensive error handling:
- Validation errors for invalid inputs
- Not found errors for missing resources
- Database connection errors
- Graceful shutdown handling

## Migration from SQLite

This backend replaces the previous SQLite-based system with:
- ✅ **Better Relationships**: Graph database for complex relationships
- ✅ **GraphQL Only**: Reduced API surface, single endpoint
- ✅ **Better Filtering**: Advanced search and filter capabilities
- ✅ **Type Safety**: Full TypeScript implementation
- ✅ **Better Performance**: Indexed queries and efficient pagination
