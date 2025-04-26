// models/driver.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Driver",
    {
      driverId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: DataTypes.STRING,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      hourlyRate: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      tableName: "Drivers",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );
};
