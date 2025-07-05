import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { config } from './config';
import { neo4jService } from './database/neo4j';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { GraphQLContext } from './types/context';
import { companyService } from './services/companyService';

async function startServer() {
  // Verify Neo4j connection
  const isConnected = await neo4jService.verifyConnection();
  if (!isConnected) {
    console.error('Failed to connect to Neo4j database');
    process.exit(1);
  }
  console.log('✅ Connected to Neo4j database');

  // Create indexes for better performance
  try {
    await companyService.createIndexes();
    console.log('✅ Database indexes created');
  } catch (error) {
    console.warn('⚠️ Index creation warning:', error);
  }

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: config.server.environment !== 'production',
    includeStacktraceInErrorResponses: config.server.environment !== 'production',
  });

  // Start the server
  const { url } = await startStandaloneServer(server, {
    listen: { port: config.server.port },
    context: async ({ req }) => ({
      neo4jService,
      dataSources: {
        companyService,
      },
    }),
  });

  console.log(`🚀 Server ready at: ${url}`);
  console.log(`📊 GraphQL Playground: ${url}graphql`);
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await neo4jService.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await neo4jService.close();
    process.exit(0);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
