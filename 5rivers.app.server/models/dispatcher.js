const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Dispatcher", {
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
    description: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    phone: {
      type: DataTypes.STRING,
    },
    commission: {
      type: DataTypes.NUMBER,
    },
  });
};
