const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Job = sequelize.define("Job", {
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
    dayOfJob: {
      type: DataTypes.STRING,
    },
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
    invoiceId: DataTypes.STRING,
    invoiceStatus: DataTypes.STRING,
    weight: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    loads: DataTypes.FLOAT,
    ticketIds: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    imageUrls: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    jobTypeId: {
      type: DataTypes.UUID,
      references: {
        model: "jobType",
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
    unitId: {
      type: DataTypes.UUID,
      references: {
        model: "Invoice",
        key: "invoiceId",
      },
    },
    invoiceStatus: {
      type: DataTypes.ENUM("Pending", "Raised", "Received"),
      allowNull: false,
      defaultValue: "Pending",
    },
  });

  return Job;
};
