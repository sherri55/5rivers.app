const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("JobType", {
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
      references: {
        model: "Company",
        key: "companyId",
      },
    },
  });
};
