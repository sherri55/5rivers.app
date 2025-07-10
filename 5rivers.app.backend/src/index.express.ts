import express from 'express';
import cors from 'cors';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import { config } from './config';
import { neo4jService } from './database/neo4j';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { companyService } from './services/companyService';
import { GraphQLContext } from './types/context';

async function startExpressServer() {
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

  const app = express();

  // CORS
  app.use(cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));

  // Serve uploads statically BEFORE Apollo
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Body parser for GraphQL
  app.use(bodyParser.json({ limit: '10mb' }));

  // Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: config.graphql.introspectionEnabled,
    includeStacktraceInErrorResponses: config.server.environment !== 'production',
  });
  await server.start();
  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({
      neo4jService,
      dataSources: { companyService },
    })
  }));

  const port = config.server.port;
  app.listen(port, () => {
    console.log(`🚀 Express GraphQL server ready at http://localhost:${port}/graphql`);
    console.log(`📁 Static uploads served at http://localhost:${port}/uploads/`);
  });
}

startExpressServer().catch((error) => {
  console.error('Failed to start Express server:', error);
  process.exit(1);
});
