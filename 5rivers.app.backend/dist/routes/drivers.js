"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/drivers.ts
const express_1 = require("express");
const driversController_1 = require("../controllers/driversController");
const driverRoutes = (0, express_1.Router)();
driverRoutes.get("/", driversController_1.getDrivers);
driverRoutes.get("/:id", driversController_1.getDriverById);
driverRoutes.post("/", driversController_1.createDriver);
driverRoutes.put("/:id", driversController_1.updateDriver);
driverRoutes.delete("/:id", driversController_1.deleteDriver);
exports.default = driverRoutes;
