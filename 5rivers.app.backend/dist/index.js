"use strict";
// c:\Users\sherr\OneDrive\Documents\Business\5 Rivers\5rivers.app\src\index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const apollo_server_express_1 = require("apollo-server-express");
const express_1 = __importDefault(require("express"));
const schema_1 = require("./src/schema"); // Your GraphQL schema
const resolvers_1 = require("./src/resolvers"); // Your resolvers
const data_source_1 = require("./src/data-source"); // Your data source
const dev_1 = require("@apollo/client/dev");
async function startServer() {
    // Initialize database connection
    await data_source_1.AppDataSource.initialize();
    const app = (0, express_1.default)();
    const server = new apollo_server_express_1.ApolloServer({
        typeDefs: schema_1.typeDefs,
        resolvers: resolvers_1.resolvers,
        context: () => {
            // You can pass the data source or other context info here
            return { dataSource: data_source_1.AppDataSource };
        },
    });
    (0, dev_1.loadDevMessages)();
    (0, dev_1.loadDevMessages)();
    await server.start();
    server.applyMiddleware({ app, path: "/api/graphql" });
    // Start Express server
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    });
}
startServer().catch((err) => {
    console.error("Error starting server:", err);
});
