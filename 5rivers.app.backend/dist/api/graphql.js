"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const apollo_server_express_1 = require("apollo-server-express");
const express_1 = __importDefault(require("express"));
const schema_1 = require("../src/schema");
const resolvers_1 = require("../src/resolvers");
const data_source_1 = require("../src/data-source");
// Initialize TypeORM only once
const dataSourcePromise = data_source_1.AppDataSource.initialize();
const app = (0, express_1.default)();
const server = new apollo_server_express_1.ApolloServer({
    typeDefs: schema_1.typeDefs,
    resolvers: resolvers_1.resolvers,
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
exports.default = app;
