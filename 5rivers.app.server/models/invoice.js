// models/invoice.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("Invoice", {
    invoiceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    invoiceDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    subTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    dispatchPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    comm: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    hst: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    billedTo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    billedEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subItems: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const v = this.getDataValue("subItems");
        return v ? JSON.parse(v) : [];
      },
      set(val) {
        this.setDataValue("subItems", JSON.stringify(val));
      },
    },
  });
};
