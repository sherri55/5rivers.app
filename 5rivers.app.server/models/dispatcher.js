// models/dispatcher.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Dispatcher",
    {
      dispatcherId: {
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
      commission: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      tableName: "Dispatchers",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );
};
