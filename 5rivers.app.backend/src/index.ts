import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { config } from './config';
import { neo4jService } from './database/neo4j';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { GraphQLContext } from './types/context';
import { companyService } from './services/companyService';
import { uploadService, UploadService } from './services/uploadService';

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

  // Start file upload server
  startFileUploadServer();

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: config.graphql.introspectionEnabled,
    includeStacktraceInErrorResponses: config.server.environment !== 'production',
  });

  // Start the GraphQL server
  const { url } = await startStandaloneServer(server, {
    listen: { port: config.server.port },
    context: async ({ req }) => ({
      neo4jService,
      dataSources: {
        companyService,
      },
    }),
  });

  console.log(`🚀 GraphQL Server ready at: ${url}`);
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

async function startFileUploadServer() {
  const app = express();
  
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // CORS configuration - more permissive for development
  app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true,
    allowedHeaders: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // File upload endpoint
  app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
      console.log('Upload request received:', {
        file: req.file ? { 
          originalname: req.file.originalname, 
          size: req.file.size,
          mimetype: req.file.mimetype 
        } : null,
        body: req.body,
        headers: Object.keys(req.headers)
      });

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const folder = (req.body.folder as string) || 'jobs';
      
      // Validate the image file
      if (!UploadService.validateImageFile(req.file.buffer, req.file.originalname)) {
        return res.status(400).json({ error: 'Invalid image file' });
      }

      const result = await uploadService.uploadImage(
        req.file.buffer,
        req.file.originalname,
        folder
      );

      console.log('Upload successful:', result);

      res.json({
        url: result.url,
        filename: result.filename
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Start the upload server on a different port
  const uploadPort = config.server.port + 1;
  app.listen(uploadPort, () => {
    console.log(`� File upload server ready at: http://localhost:${uploadPort}`);
    console.log(`� Upload endpoint: http://localhost:${uploadPort}/api/upload`);
  });
}
  
// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
