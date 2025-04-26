// models/jobType.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "JobType",
    {
      jobTypeId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      startLocation: DataTypes.STRING,
      endLocation: DataTypes.STRING,
      dispatchType: DataTypes.STRING,
      rateOfJob: DataTypes.FLOAT,
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Companies",
          key: "companyId",
        },
      },
    },
    {
      tableName: "JobTypes",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );
};
