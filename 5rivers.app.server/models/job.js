// models/job.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Job", {
    jobId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateOfJob: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dayOfJob: DataTypes.STRING,
    dispatchType: DataTypes.STRING,
    startTimeForDriver: DataTypes.STRING,
    endTimeForDriver: DataTypes.STRING,
    startTimeForJob: DataTypes.STRING,
    endTimeForJob: DataTypes.STRING,
    unitName: DataTypes.STRING,
    driverName: DataTypes.STRING,
    hoursOfDriver: DataTypes.FLOAT,
    hoursOfJob: DataTypes.FLOAT,
    jobGrossAmount: DataTypes.FLOAT,
    driverRate: DataTypes.FLOAT,
    driverPay: DataTypes.FLOAT,
    estimatedFuel: DataTypes.FLOAT,
    estimatedRevenue: DataTypes.FLOAT,
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Invoice",
        key: "invoiceId",
      },
    },
    invoiceStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Pending",
      validate: {
        isIn: [["Pending", "Raised", "Received"]],
      },
    },
    weight: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const v = this.getDataValue("weight");
        return v ? JSON.parse(v) : null;
      },
      set(val) {
        this.setDataValue("weight", JSON.stringify(val));
      },
    },
    loads: DataTypes.FLOAT,
    ticketIds: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const v = this.getDataValue("ticketIds");
        return v ? JSON.parse(v) : null;
      },
      set(val) {
        this.setDataValue("ticketIds", JSON.stringify(val));
      },
    },
    imageUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const v = this.getDataValue("imageUrls");
        return v ? JSON.parse(v) : [];
      },
      set(val) {
        this.setDataValue("imageUrls", JSON.stringify(val));
      },
    },
    jobTypeId: {
      type: DataTypes.UUID,
      references: {
        model: "JobType",
        key: "jobTypeId",
      },
    },
    driverId: {
      type: DataTypes.UUID,
      references: {
        model: "Driver",
        key: "driverId",
      },
    },
    dispatcherId: {
      type: DataTypes.UUID,
      references: {
        model: "Dispatcher",
        key: "dispatcherId",
      },
    },
    unitId: {
      type: DataTypes.UUID,
      references: {
        model: "Unit",
        key: "unitId",
      },
    },
  });
};
