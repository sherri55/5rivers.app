require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Sequelize } = require("sequelize");
const path = require("path");
const multer = require("multer");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files in the "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage });

const app = express();
app.use(express.json());
app.use(cors());

app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 3000;
const DB_STORAGE = process.env.DB_STORAGE || "./db.sqlite";

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_STORAGE,
  logging: false, // Disable logging for cleaner output
});

// Import models
const Unit = require("./models/unit")(sequelize);
const Company = require("./models/company")(sequelize);
const Dispatcher = require("./models/dispatcher")(sequelize);
const Driver = require("./models/driver")(sequelize);
const Job = require("./models/job")(sequelize);
const JobType = require("./models/jobType")(sequelize);
const Invoice = require("./models/invoice")(sequelize);

// Define associations
Job.belongsTo(JobType, { foreignKey: "jobTypeId" });
Job.belongsTo(Driver, { foreignKey: "driverId" });
Job.belongsTo(Dispatcher, { foreignKey: "dispatcherId" });
Job.belongsTo(Unit, { foreignKey: "unitId" });

JobType.belongsTo(Company, { foreignKey: "companyId" });
JobType.hasMany(Job, { foreignKey: "jobTypeId" });
Driver.hasMany(Job, { foreignKey: "driverId" });
Dispatcher.hasMany(Job, { foreignKey: "dispatcherId" });
Unit.hasMany(Job, { foreignKey: "unitId" });

// Helper functions for computed fields
function computeDayOfJob(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}
function computeHours(start, end) {
  if (!start || !end) return 0;
  const [startHour, startMin] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);
  const startTotal = startHour * 60 + startMin;
  let endTotal = endHour * 60 + endMin;
  if (endTotal < startTotal) {
    // Treat as next day by adding 24 hours in minutes
    endTotal += 24 * 60;
  }
  return (endTotal - startTotal) / 60;
}

function computeJobGrossAmount(job, jobType) {
  const { hoursOfJob, weight, loads } = job;
  const { rateOfJob, dispatchType } = jobType;

  const parsedRate = parseFloat(rateOfJob) || 0;

  switch (dispatchType) {
    case "Hourly":
      return (parseFloat(hoursOfJob) || 0) * parsedRate;

    case "Tonnage":
      return (parseFloat(weight) || 0) * parsedRate;

    case "Load":
      return (parseInt(loads, 10) || 0) * parsedRate;

    case "Fixed":
      return parsedRate;

    default:
      console.warn(`Unknown dispatchType "${dispatchType}". Returning 0.`);
      return 0;
  }
}

function computeDriverPay(job, jobType, driver) {
  const { hoursOfDriver, loads } = job;
  const { hourlyRate } = driver;
  const { dispatchType, rateOfJob } = jobType;

  const parsedHourlyRate = parseFloat(hourlyRate) || 0;
  const parsedRateOfJob = parseFloat(rateOfJob) || 0;

  switch (dispatchType) {
    case "Hourly":
    case "Tonnage":
      return (parseFloat(hoursOfDriver) || 0) * parsedHourlyRate;

    case "Load":
      return (
        (parseInt(loads, 10) || 0) * parsedRateOfJob * (parsedHourlyRate / 100)
      );

    case "Fixed":
      // Assuming driver gets a percentage (hourlyRate) of the fixed rate
      return parsedRateOfJob * (parsedHourlyRate / 100);

    default:
      console.warn(`Unknown dispatchType "${dispatchType}". Returning 0.`);
      return 0;
  }
}

function computeEstimatedFuel(job) {
  const { hoursOfDriver } = job;
  return hoursOfDriver * 30;
}

function computeEstimatedRevenue(job) {
  return job.jobGrossAmount - job.driverPay;
}

// Define routes for each entity following REST best practices

// Unit Routes
app.get("/units", async (req, res) => {
  try {
    const units = await Unit.findAll();
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/units", async (req, res) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/units/:id", async (req, res) => {
  try {
    const unit = await Unit.findByPk(req.params.id);
    if (!unit) return res.status(404).json({ error: "Unit not found" });
    await unit.update(req.body);
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/units/:id", async (req, res) => {
  try {
    const unit = await Unit.findByPk(req.params.id);
    if (!unit) return res.status(404).json({ error: "Unit not found" });
    await unit.destroy();
    res.json({ message: "Unit deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Company Routes
app.get("/companies", async (req, res) => {
  try {
    const companies = await Company.findAll();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/companies", async (req, res) => {
  try {
    console.log(req.body);
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put("/companies/:id", async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: "Company not found" });
    await company.update(req.body);
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/companies/:id", async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: "Company not found" });
    await company.destroy();
    res.json({ message: "Company deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dispatcher Routes
app.get("/dispatchers", async (req, res) => {
  try {
    const dispatchers = await Dispatcher.findAll();
    res.json(dispatchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/dispatchers", async (req, res) => {
  try {
    const dispatcher = await Dispatcher.create(req.body);
    res.status(201).json(dispatcher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/invoices", async (req, res) => {
  try {
    // Destructure to remove subItems from the invoice data
    const { subItems } = req.body;
    // Now, invoiceData should only include fields defined in your Invoice model
    const invoice = await Invoice.create(req.body);
    if (subItems && Array.isArray(subItems) && subItems.length > 0) {
      await Promise.all(
        subItems.map((item) => {
          console.log(item);
          return Job.update(
            { invoiceId: invoice.invoiceId },
            { where: { jobId: item.jobId } }
          );
        })
      );
    }
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this code after the existing POST /invoices route in index.js

app.get("/invoices", async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      order: [['createdAt', 'DESC']] // Sort by newest first
    });
    
    // For each invoice, find the associated jobs
    const invoicesWithJobs = await Promise.all(
      invoices.map(async (invoice) => {
        const invoiceData = invoice.toJSON();
        
        // Find all jobs associated with this invoice
        const associatedJobs = await Job.findAll({
          where: { invoiceId: invoice.invoiceId },
          include: [
            { model: JobType },
            { model: Driver },
            { model: Dispatcher },
            { model: Unit }
          ]
        });
        
        return {
          ...invoiceData,
          jobs: associatedJobs
        };
      })
    );
    
    res.json(invoicesWithJobs);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a route to get a single invoice by ID
app.get("/invoices/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    // Find all jobs associated with this invoice
    const associatedJobs = await Job.findAll({
      where: { invoiceId: invoice.invoiceId },
      include: [
        { model: JobType },
        { model: Driver },
        { model: Dispatcher },
        { model: Unit }
      ]
    });
    
    const invoiceData = invoice.toJSON();
    
    res.json({
      ...invoiceData,
      jobs: associatedJobs
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a route to delete an invoice by ID
app.delete("/invoices/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    // Update associated jobs to remove the invoiceId
    await Job.update(
      { invoiceId: null },
      { where: { invoiceId: invoice.invoiceId } }
    );
    
    // Delete the invoice
    await invoice.destroy();
    
    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/dispatchers/:id", async (req, res) => {
  try {
    const dispatcher = await Dispatcher.findByPk(req.params.id);
    if (!dispatcher)
      return res.status(404).json({ error: "Dispatcher not found" });
    await dispatcher.update(req.body);
    res.json(dispatcher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/dispatchers/:id", async (req, res) => {
  try {
    const dispatcher = await Dispatcher.findByPk(req.params.id);
    if (!dispatcher)
      return res.status(404).json({ error: "Dispatcher not found" });
    await dispatcher.destroy();
    res.json({ message: "Dispatcher deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// jobtypes Routes
app.get("/jobtypes", async (req, res) => {
  try {
    const jobType = await JobType.findAll();
    res.json(jobType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/jobtypes", async (req, res) => {
  try {
    const jobType = await JobType.create(req.body);
    res.status(201).json(jobType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/jobtypes/:id", async (req, res) => {
  try {
    const jobType = await JobType.findByPk(req.params.id);
    if (!jobType) return res.status(404).json({ error: "jobType not found" });
    await jobType.update(req.body);
    res.json(jobType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/jobtypes/:id", async (req, res) => {
  try {
    const jobType = await JobType.findByPk(req.params.id);
    if (!jobType) return res.status(404).json({ error: "jobType not found" });
    await jobType.destroy();
    res.json({ message: "jobType deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver Routes
app.get("/drivers", async (req, res) => {
  try {
    const drivers = await Driver.findAll();
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/drivers", async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/drivers/:id", async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    await driver.update(req.body);
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/drivers/:id", async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    await driver.destroy();
    res.json({ message: "Driver deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Job Routes
app.put("/jobs/:id", upload.array("images", 10), async (req, res) => {
  try {
    const jobId = req.params.id;
    const jobData = req.body;

    // Find the job by ID
    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const jobTypeData = await JobType.findByPk(jobData.jobTypeId);
    if (!jobTypeData) {
      return res.status(404).json({ error: "Job Type not found" });
    }

    const driverData = await Driver.findByPk(jobData.driverId);
    if (!driverData) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Compute fields before updating
    jobData.dayOfJob = computeDayOfJob(jobData.dateOfJob);
    jobData.hoursOfDriver = computeHours(
      jobData.startTimeForDriver,
      jobData.endTimeForDriver
    );
    jobData.hoursOfJob = computeHours(
      jobData.startTimeForJob,
      jobData.endTimeForJob
    );
    jobData.jobGrossAmount = computeJobGrossAmount(jobData, jobTypeData);
    jobData.driverPay = computeDriverPay(jobData, jobTypeData, driverData);
    jobData.estimatedFuel = computeEstimatedFuel(
      jobData.hoursOfDriver,
      jobData
    );
    jobData.estimatedRevenue = computeEstimatedRevenue(jobData);

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      jobData.imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
    }

    // Update the job
    await job.update(jobData);
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/jobs/:id", async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findByPk(jobId, {
      include: [
        { model: JobType },
        { model: Driver },
        { model: Dispatcher },
        { model: Unit },
      ],
    });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/jobs/:id", async (req, res) => {
  try {
    try {
      const job = await Job.findByPk(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      await job.destroy();
      res.json({ message: "Job deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.findAll({
      include: [
        { model: JobType },
        { model: Driver },
        { model: Dispatcher },
        { model: Unit },
      ],
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/jobs", (req, res) => {
  const jobData = req.body;

  JobType.findByPk(jobData.jobTypeId)
    .then((jobTypeData) => {
      if (!jobTypeData) {
        return res.status(404).json({ error: "Job Type not found" });
      }

      Driver.findByPk(jobData.driverId)
        .then((driverData) => {
          if (!driverData) {
            return res.status(404).json({ error: "Driver not found" });
          }

          (jobData.dayOfJob = computeDayOfJob(jobData.dateOfJob)),
            (jobData.hoursOfDriver = computeHours(
              jobData.startTimeForDriver,
              jobData.endTimeForDriver
            )),
            (jobData.hoursOfJob = computeHours(
              jobData.startTimeForJob,
              jobData.endTimeForJob
            )),
            (jobData.jobGrossAmount = computeJobGrossAmount(
              jobData,
              jobTypeData
            )),
            (jobData.driverPay = computeDriverPay(
              jobData,
              jobTypeData,
              driverData
            )),
            (jobData.estimatedFuel = computeEstimatedFuel(jobData)),
            (jobData.estimatedRevenue = computeEstimatedRevenue(jobData)),
            (jobData.imageUrls = req.files
              ? req.files.map((file) => `/uploads/${file.filename}`)
              : []),
            Job.create(jobData)
              .then((job) => {
                res.status(201).json(job);
              })
              .catch((error) => {
                res.status(500).json({ error: error.message });
              });
        })
        .catch((error) => {
          res.status(500).json({ error: error.message });
        });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

// Start the server
const start = async () => {
  try {
    await sequelize.sync({ force: false }); // Set `force: true` to reset the database
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start the app:", error);
  }
};

start();
