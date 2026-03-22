import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { config } from './config';
import { neo4jService } from './database/neo4j';
import { ensureIndexes } from './database/ensureIndexes';
import { ensureConstraints } from './database/ensureConstraints';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { companyService } from './services/companyService';
import { uploadService, UploadService } from './services/uploadService';
import { storeImage, getImageById } from './services/imageStorageService';
import { GraphQLContext } from './types/context';
import authRoutes from './routes/authRoutes';
import { authMiddleware } from './auth/authMiddleware';
import { verifyToken } from './auth/authService';

async function startExpressServer() {
  const isConnected = await neo4jService.verifyConnection();
  if (!isConnected) {
    console.error('Failed to connect to Neo4j database');
    process.exit(1);
  }
  console.log('✅ Connected to Neo4j database');

  try {
    await companyService.createIndexes();
    await ensureIndexes();
    console.log('✅ Database indexes created');
  } catch (error) {
    console.warn('⚠️ Index creation warning:', error);
  }
  try {
    await ensureConstraints();
    console.log('✅ Database constraints ensured');
  } catch (error) {
    console.warn('⚠️ Constraint warning (non-fatal):', error);
  }

  const app = express();

  app.use(cors({
    origin: config.server.allowedOrigins.length > 0 ? config.server.allowedOrigins : true,
    credentials: true,
    allowedHeaders: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use(express.json({ limit: '10mb' }));

  // Auth routes (no auth required)
  app.use('/api/auth', authRoutes);

  // Upload (auth required)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimeOk = allowedTypes.test(file.mimetype);
      if (mimeOk && extOk) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Upload image: compress and store in Neo4j (no files on disk)
  app.post('/api/upload', authMiddleware, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      if (!UploadService.validateImageFile(req.file.buffer, req.file.originalname)) {
        res.status(400).json({ error: 'Invalid image file' });
        return;
      }

      const result = await storeImage(req.file.buffer, req.file.originalname);

      res.json({ url: result.url, filename: result.id, imageId: result.id });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve stored images from Neo4j (no auth so <img src=".../api/images/:id"> works)
  app.get('/api/images/:id', async (req, res) => {
    try {
      const imageId = req.params.id;
      if (!imageId) {
        res.status(400).send('Missing image id');
        return;
      }
      const image = await getImageById(imageId);
      if (!image) {
        res.status(404).send('Image not found');
        return;
      }
      const buffer = image.buffer ?? Buffer.from(image.dataBase64, 'base64');
      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(buffer);
    } catch (error) {
      console.error('Image serve error:', error);
      res.status(500).send('Failed to load image');
    }
  });

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: config.graphql.introspectionEnabled,
    includeStacktraceInErrorResponses: config.server.environment !== 'production',
  });
  await server.start();

  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const user = token ? verifyToken(token) : null;

      return {
        neo4jService,
        dataSources: { companyService },
        user,
      };
    }
  }));

  const port = config.server.port;
  app.listen(port, () => {
    console.log(`🚀 Express server ready at http://localhost:${port}`);
    console.log(`📊 GraphQL: http://localhost:${port}/graphql`);
    console.log(`📁 Uploads: http://localhost:${port}/uploads/`);
    if (config.server.environment !== 'production') {
      const adminUser = process.env.ADMIN_USERNAME || 'admin';
      const authHint = process.env.ADMIN_PASSWORD_HASH ? '(password from ADMIN_PASSWORD_HASH)' : '(default password: changeme, or set ADMIN_PASSWORD)';
      console.log(`🔐 Admin login: username "${adminUser}" ${authHint}`);
    }
  });
}

startExpressServer().catch((error) => {
  console.error('Failed to start Express server:', error);
  process.exit(1);
});
