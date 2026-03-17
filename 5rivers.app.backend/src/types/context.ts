import { TokenPayload } from '../auth/authService';
import { Neo4jService } from '../database/neo4j';

export interface GraphQLContext {
  neo4jService: Neo4jService;
  dataSources?: {
    companyService: any;
  };
  user?: TokenPayload | null;
}
