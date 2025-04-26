// graphql/resolvers.js
const { Op } = require("sequelize");

module.exports = {
  Query: {
    units: (_parent, _args, { models }) => models.Unit.findAll(),
    drivers: (_parent, _args, { models }) => models.Driver.findAll(),
    dispatchers: (_parent, _args, { models }) => models.Dispatcher.findAll(),
    companies: (_parent, _args, { models }) => models.Company.findAll(),
    jobTypes: (_parent, _args, { models }) => models.JobType.findAll(),
    invoices: (_parent, _args, { models }) => models.Invoice.findAll(),

    job: (_parent, { jobId }, { models }) => models.Job.findByPk(jobId),

    jobs: (_parent, { filter = {}, limit, offset }, { models }) => {
      const where = {};
      if (filter.dateStart) where.dateOfJob = { [Op.gte]: filter.dateStart };
      if (filter.dateEnd)
        where.dateOfJob = { ...where.dateOfJob, [Op.lte]: filter.dateEnd };
      if (filter.dispatchType) where.dispatchType = filter.dispatchType;
      if (filter.invoiceStatus) where.invoiceStatus = filter.invoiceStatus;
      if (filter.driverId) where.driverId = filter.driverId;
      if (filter.unitId) where.unitId = filter.unitId;
      return models.Job.findAll({ where, limit, offset });
    },
  },

  Mutation: {
    createJob: async (_parent, { input }, { models }) => {
      const job = await models.Job.create(input);
      return models.Job.findByPk(job.jobId);
    },
    updateInvoiceStatus: async (_parent, { input }, { models }) => {
      await models.Job.update(
        { invoiceStatus: input.status },
        { where: { jobId: input.jobId } }
      );
      return models.Job.findByPk(input.jobId);
    },
    deleteJob: async (_parent, { jobId }, { models }) => {
      const deleted = await models.Job.destroy({ where: { jobId } });
      return deleted === 1;
    },
  },

  Job: {
    unit: (job, _args, { models }) => models.Unit.findByPk(job.unitId),
    driver: (job, _args, { models }) => models.Driver.findByPk(job.driverId),
    dispatcher: (job, _args, { models }) =>
      models.Dispatcher.findByPk(job.dispatcherId),
    jobType: (job, _args, { models }) => models.JobType.findByPk(job.jobTypeId),
    invoice: (job, _args, { models }) =>
      job.invoiceId ? models.Invoice.findByPk(job.invoiceId) : null,
  },

  Unit: {
    jobs: (unit, { limit, offset }) => unit.getJobs({ limit, offset }),
  },
  Driver: {
    jobs: (driver, { limit, offset }) => driver.getJobs({ limit, offset }),
  },
  Dispatcher: {
    jobs: (dispatcher, { limit, offset }) =>
      dispatcher.getJobs({ limit, offset }),
  },
  Company: {
    jobTypes: (company) => company.getJobTypes(),
  },
  JobType: {
    jobs: (jt, { limit, offset }) => jt.getJobs({ limit, offset }),
  },
  Invoice: {
    jobs: (invoice) => invoice.getJobs(),
  },
};
