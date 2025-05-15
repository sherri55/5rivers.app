// api/index.js
require("dotenv").config();
const serverless = require("serverless-http");
const express = require("express");
const cors = require("cors");
const { Sequelize } = require("sequelize");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// Multer: write to /public/uploads/jobs
const uploadsDir = path.join(__dirname, "../../public/uploads/jobs");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    let jobId = req.params.id || (req.body && req.body.jobId);
    let index = (req.fileIndex = (req.fileIndex || 0) + 1);
    const ext = path.extname(file.originalname);
    if (jobId) {
      cb(null, `job-${jobId}-${Date.now()}-${index}${ext}`);
    } else {
      cb(null, `${Date.now()}-${index}${ext}`);
    }
  },
});
const upload = multer({ storage });

const app = express();
app.use(express.json());
app.use(cors());

// Serve uploads from /public/uploads/jobs
app.use("/uploads/jobs", express.static(uploadsDir));

const DB_STORAGE = process.env.DB_STORAGE || "/tmp/db.sqlite";
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_STORAGE,
  logging: false,
});

// Import models
const Unit = require("./models/unit")(sequelize);
const Company = require("./models/company")(sequelize);
const Dispatcher = require("./models/dispatcher")(sequelize);
const Driver = require("./models/driver")(sequelize);
const Job = require("./models/job")(sequelize);
const JobType = require("./models/jobType")(sequelize);
const Invoice = require("./models/invoice")(sequelize);

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
    endTotal += 24 * 60;
  }
  return (endTotal - startTotal) / 60;
}

function roundUpToNext15Minutes(hours) {
  const totalMinutes = Math.ceil(hours * 60);
  const roundedMinutes = Math.ceil(totalMinutes / 15) * 15;
  return roundedMinutes / 60;
}

function computeJobGrossAmount(job, jobType) {
  const { hoursOfJob, weight, loads } = job;
  const { rateOfJob, dispatchType } = jobType;
  const parsedRate = parseFloat(rateOfJob) || 0;

  let totalWeight = 0;
  if (dispatchType === "Tonnage") {
    try {
      const weights = Array.isArray(weight) ? weight : JSON.parse(weight);
      if (Array.isArray(weights)) {
        totalWeight = weights
          .map((w) => parseFloat(w) || 0)
          .reduce((sum, w) => sum + w, 0);
      } else {
        totalWeight = parseFloat(weights) || 0;
      }
    } catch {
      totalWeight = parseFloat(weight) || 0;
    }
  }

  switch (dispatchType) {
    case "Hourly": {
      const hoursRounded = roundUpToNext15Minutes(parseFloat(hoursOfJob) || 0);
      return hoursRounded * parsedRate;
    }
    case "Tonnage":
      return totalWeight * parsedRate;
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
    const result = await Promise.all(
      dispatchers.map(async (dispatcher) => {
        const jobsCount = await Job.count({
          where: { dispatcherId: dispatcher.dispatcherId },
        });
        const invoicesCount = await Invoice.count({
          where: { dispatcherId: dispatcher.dispatcherId },
        });
        return {
          ...dispatcher.toJSON(),
          jobsCount,
          invoicesCount,
        };
      })
    );
    res.json(result);
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
    const { subItems } = req.body;
    const invoice = await Invoice.create(req.body);
    if (req.body.subItems?.length) {
      await Promise.all(
        req.body.subItems.map((item) =>
          Job.update(
            { invoiceId: invoice.invoiceId, invoiceStatus: "Raised" },
            { where: { jobId: item.jobId }, transaction: t }
          )
        )
      );
    }
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/invoices", async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      order: [["createdAt", "DESC"]],
    });

    const invoicesWithJobs = await Promise.all(
      invoices.map(async (invoice) => {
        const invoiceData = invoice.toJSON();

        const associatedJobs = await Job.findAll({
          where: { invoiceId: invoice.invoiceId },
          include: [
            { model: JobType },
            { model: Driver },
            { model: Dispatcher },
            { model: Unit },
          ],
        });

        return {
          ...invoiceData,
          jobs: associatedJobs,
        };
      })
    );

    res.json(invoicesWithJobs);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/invoices/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const associatedJobs = await Job.findAll({
      where: { invoiceId: invoice.invoiceId },
      include: [
        { model: JobType },
        { model: Driver },
        { model: Dispatcher },
        { model: Unit },
      ],
    });

    const invoiceData = invoice.toJSON();

    res.json({
      ...invoiceData,
      jobs: associatedJobs,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/invoices/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    await Job.update(
      { invoiceId: null },
      { where: { invoiceId: invoice.invoiceId } }
    );

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
app.post("/jobs", upload.array("images", 10), (req, res) => {
  const jobData = {
    ...req.body,
    invoiceStatus: req.body.invoiceStatus || "Pending",
  };
  if (req.files) {
    jobData.imageUrls = req.files.map(
      (f) => `/uploads/jobs/${path.basename(f.path)}`
    );
  }

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
          jobData.driverPay = computeDriverPay(
            jobData,
            jobTypeData,
            driverData
          );
          jobData.estimatedFuel = computeEstimatedFuel(jobData);
          jobData.estimatedRevenue = computeEstimatedRevenue(jobData);

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

app.put("/jobs/:id", upload.array("images", 10), async (req, res) => {
  try {
    const jobId = req.params.id;
    const jobData = {
      ...req.body,
      invoiceStatus: req.body.invoiceStatus ?? job.invoiceStatus ?? "Pending",
    };
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

    let imageUrls = Array.isArray(job.imageUrls) ? job.imageUrls : [];
    if (req.files && req.files.length > 0) {
      const newUrls = req.files.map(
        (file) => `/uploads/jobs/${path.basename(file.path)}`
      );
      imageUrls = [...imageUrls, ...newUrls];
    }
    jobData.imageUrls = imageUrls;

    const updates = { ...jobData };

    await job.update(updates);
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
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.imageUrls && Array.isArray(job.imageUrls)) {
      for (const imgPath of job.imageUrls) {
        const absPath = path.join(__dirname, "../../public", imgPath);
        if (fs.existsSync(absPath)) {
          try {
            fs.unlinkSync(absPath);
          } catch {}
        }
      }
    }

    await job.destroy();
    res.json({ message: "Job deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/jobs/:id/invoice-status", async (req, res) => {
  const { status } = req.body;
  const allowed = ["Pending", "Raised", "Received"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid invoiceStatus" });
  }

  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    job.invoiceStatus = status;
    await job.save();
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

module.exports = app;
module.exports.handler = serverless(app);
