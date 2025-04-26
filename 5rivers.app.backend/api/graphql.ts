import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { typeDefs } from "../src/schema";
import { resolvers } from "../src/resolvers";
import { AppDataSource } from "../src/data-source";

// Initialize TypeORM only once
const dataSourcePromise = AppDataSource.initialize();

const app = express();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async () => {
    const dataSource = await dataSourcePromise;
    return { dataSource };
  },
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app, path: "/api/graphql" });
}

startServer();

export default app;
