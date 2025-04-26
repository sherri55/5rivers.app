require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { ApolloServer } = require("apollo-server-express");

// Sequelize & models
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize({
  dialect: "mssql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  dialectOptions: { options: { encrypt: true } },
  pool: { max: 5, min: 0, idle: 10000 },
  logging: false,
});

// Import model definitions
const Unit = require("./models/unit")(sequelize, DataTypes);
const Company = require("./models/company")(sequelize, DataTypes);
const Dispatcher = require("./models/dispatcher")(sequelize, DataTypes);
const Driver = require("./models/driver")(sequelize, DataTypes);
const JobType = require("./models/jobType")(sequelize, DataTypes);
const Invoice = require("./models/invoice")(sequelize, DataTypes);
const Job = require("./models/job")(sequelize, DataTypes);

// Define associations
Job.belongsTo(JobType, { foreignKey: "jobTypeId" });
Job.belongsTo(Driver, { foreignKey: "driverId" });
Job.belongsTo(Dispatcher, { foreignKey: "dispatcherId" });
Job.belongsTo(Unit, { foreignKey: "unitId" });
Invoice.hasMany(Job, { foreignKey: "invoiceId" });
JobType.belongsTo(Company, { foreignKey: "companyId" });
Company.hasMany(JobType, { foreignKey: "companyId" });
Driver.hasMany(Job, { foreignKey: "driverId" });
Dispatcher.hasMany(Job, { foreignKey: "dispatcherId" });
Unit.hasMany(Job, { foreignKey: "unitId" });

// Multer for image uploads (jobs)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// GraphQL schema & resolvers
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");

async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // REST endpoints
  // Units
  app.get("/units", async (req, res) => {
    try {
      const units = await Unit.findAll();
      res.json(units);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/units/:id", async (req, res) => {
    try {
      const unit = await Unit.findByPk(req.params.id);
      if (!unit) return res.status(404).end();
      res.json(unit);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/units", async (req, res) => {
    try {
      const unit = await Unit.create(req.body);
      res.status(201).json(unit);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/units/:id", async (req, res) => {
    try {
      const unit = await Unit.findByPk(req.params.id);
      if (!unit) return res.status(404).end();
      await unit.update(req.body);
      res.json(unit);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/units/:id", async (req, res) => {
    try {
      const deleted = await Unit.destroy({ where: { unitId: req.params.id } });
      res.json({ deleted: !!deleted });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Companies
  app.get("/companies", async (req, res) => {
    try {
      res.json(await Company.findAll());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/companies/:id", async (req, res) => {
    try {
      const c = await Company.findByPk(req.params.id);
      if (!c) return res.status(404).end();
      res.json(c);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/companies", async (req, res) => {
    try {
      const c = await Company.create(req.body);
      res.status(201).json(c);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/companies/:id", async (req, res) => {
    try {
      const c = await Company.findByPk(req.params.id);
      if (!c) return res.status(404).end();
      await c.update(req.body);
      res.json(c);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/companies/:id", async (req, res) => {
    try {
      const del = await Company.destroy({
        where: { companyId: req.params.id },
      });
      res.json({ deleted: !!del });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Dispatchers, Drivers, JobTypes, Invoices follow same pattern...
  const crud = [
    { model: Dispatcher, name: "dispatchers" },
    { model: Driver, name: "drivers" },
    { model: JobType, name: "jobtypes" },
    { model: Invoice, name: "invoices" },
  ];

  crud.forEach(({ model, name }) => {
    app.get(`/${name}`, async (req, res) => {
      try {
        res.json(await model.findAll());
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    app.get(`/${name}/:id`, async (req, res) => {
      try {
        const rec = await model.findByPk(req.params.id);
        if (!rec) return res.status(404).end();
        res.json(rec);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    app.post(`/${name}`, async (req, res) => {
      try {
        const rec = await model.create(req.body);
        res.status(201).json(rec);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    app.put(`/${name}/:id`, async (req, res) => {
      try {
        const rec = await model.findByPk(req.params.id);
        if (!rec) return res.status(404).end();
        await rec.update(req.body);
        res.json(rec);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    app.delete(`/${name}/:id`, async (req, res) => {
      try {
        const del = await model.destroy({
          where: { [model.primaryKeyAttribute]: req.params.id },
        });
        res.json({ deleted: !!del });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  });

  // Jobs: include image upload on PUT
  app.get("/jobs", async (req, res) => {
    try {
      res.json(await Job.findAll());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/jobs/:id", async (req, res) => {
    try {
      const j = await Job.findByPk(req.params.id);
      if (!j) return res.status(404).end();
      res.json(j);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/jobs", async (req, res) => {
    try {
      const j = await Job.create(req.body);
      res.status(201).json(j);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/jobs/:id", upload.array("images", 10), async (req, res) => {
    try {
      const j = await Job.findByPk(req.params.id);
      if (!j) return res.status(404).end();
      // handle imageUrls if files present
      if (req.files) {
        const urls = req.files.map((f) => `/uploads/${f.filename}`);
        req.body.imageUrls = [...(j.imageUrls || []), ...urls];
      }
      await j.update(req.body);
      res.json(j);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/jobs/:id", async (req, res) => {
    try {
      const del = await Job.destroy({ where: { jobId: req.params.id } });
      res.json({ deleted: !!del });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GraphQL middleware
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: {
      sequelize,
      models: { Unit, Company, Dispatcher, Driver, JobType, Invoice, Job },
    },
  });
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  // Health check
  app.get("/", (req, res) => res.send("5Rivers Truck Management API is live"));

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(
      `🚀 Server ready at http://localhost:${port}${server.graphqlPath}`
    );
  });
}

start().catch((err) => console.error("Failed to start server:", err));
