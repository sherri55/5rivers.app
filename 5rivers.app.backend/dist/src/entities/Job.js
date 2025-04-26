"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Job = void 0;
const typeorm_1 = require("typeorm");
const JobType_1 = require("./JobType");
const Driver_1 = require("./Driver");
const Dispatcher_1 = require("./Dispatcher");
const Unit_1 = require("./Unit");
const Invoice_1 = require("./Invoice");
let Job = class Job {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid", { name: "jobId" }),
    __metadata("design:type", String)
], Job.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "title", length: 255 }),
    __metadata("design:type", String)
], Job.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "dateOfJob", type: "date" }),
    __metadata("design:type", String)
], Job.prototype, "dateOfJob", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "dayOfJob", length: 50, nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "dayOfJob", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "startTimeForDriver", length: 50, nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "startTimeForDriver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "endTimeForDriver", length: 50, nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "endTimeForDriver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "startTimeForJob", length: 50, nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "startTimeForJob", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "endTimeForJob", length: 50, nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "endTimeForJob", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "hoursOfDriver", type: "float", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "hoursOfDriver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "hoursOfJob", type: "float", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "hoursOfJob", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "dispatchType", length: 100, nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "dispatchType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "jobGrossAmount", type: "float", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "jobGrossAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "driverRate", type: "float", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "driverRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "driverPay", type: "float", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "driverPay", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "estimatedFuel", type: "float", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "estimatedFuel", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "estimatedRevenue",
        type: "float",
        nullable: true,
        default: 0,
    }),
    __metadata("design:type", Number)
], Job.prototype, "estimatedRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "imageUrls", type: "nvarchar", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "imageUrls", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "ticketIds", type: "nvarchar", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "ticketIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "weight", type: "nvarchar", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "loads", type: "float", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "loads", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "invoiceId", type: "uniqueidentifier", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "invoiceStatus", length: 20, default: "Pending" }),
    __metadata("design:type", String)
], Job.prototype, "invoiceStatus", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "createdAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Job.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updatedAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Job.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "driverName", length: 255, nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "driverName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "unitId", type: "uuid", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "unitId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "jobTypeId", type: "uuid", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "jobTypeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "driverId", type: "uuid", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "dispatcherId", type: "uuid", nullable: true }),
    __metadata("design:type", String)
], Job.prototype, "dispatcherId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => JobType_1.JobType, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "jobTypeId" }),
    __metadata("design:type", JobType_1.JobType)
], Job.prototype, "jobType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Driver_1.Driver, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "driverId" }),
    __metadata("design:type", Driver_1.Driver)
], Job.prototype, "driver", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Dispatcher_1.Dispatcher, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "dispatcherId" }),
    __metadata("design:type", Dispatcher_1.Dispatcher)
], Job.prototype, "dispatcher", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Unit_1.Unit, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "unitId" }),
    __metadata("design:type", Unit_1.Unit)
], Job.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Invoice_1.Invoice, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "invoiceId" }),
    __metadata("design:type", Invoice_1.Invoice)
], Job.prototype, "invoice", void 0);
Job = __decorate([
    (0, typeorm_1.Entity)("Jobs")
], Job);
exports.Job = Job;
