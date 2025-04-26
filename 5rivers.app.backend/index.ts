// c:\Users\sherr\OneDrive\Documents\Business\5 Rivers\5rivers.app\src\index.ts

import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { typeDefs } from "./src/schema"; // Your GraphQL schema
import { resolvers } from "./src/resolvers"; // Your resolvers
import { AppDataSource } from "./src/data-source"; // Your data source
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";

async function startServer() {
  // Initialize database connection
  await AppDataSource.initialize();

  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => {
      // You can pass the data source or other context info here
      return { dataSource: AppDataSource };
    },
  });

  loadDevMessages();
  loadDevMessages();

  await server.start();
  server.applyMiddleware({ app, path: "/api/graphql" });

  // Start Express server
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
