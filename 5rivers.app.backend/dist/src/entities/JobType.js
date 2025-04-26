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
exports.JobType = void 0;
// src/entities/JobType.ts
const typeorm_1 = require("typeorm");
let JobType = class JobType {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid", { name: "jobTypeId" }),
    __metadata("design:type", String)
], JobType.prototype, "jobTypeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "title", length: 255 }),
    __metadata("design:type", String)
], JobType.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "startLocation", length: 255, nullable: true }),
    __metadata("design:type", String)
], JobType.prototype, "startLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "endLocation", length: 255, nullable: true }),
    __metadata("design:type", String)
], JobType.prototype, "endLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "dispatchType", length: 255, nullable: true }),
    __metadata("design:type", String)
], JobType.prototype, "dispatchType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "rateOfJob", type: "float", default: 0 }),
    __metadata("design:type", Number)
], JobType.prototype, "rateOfJob", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "createdAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], JobType.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updatedAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], JobType.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "companyId", type: "uuid" }),
    __metadata("design:type", String)
], JobType.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "isActive", type: "bit", default: true }),
    __metadata("design:type", Boolean)
], JobType.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)({ name: "rowVersion" }),
    __metadata("design:type", Buffer)
], JobType.prototype, "rowVersion", void 0);
JobType = __decorate([
    (0, typeorm_1.Entity)("JobTypes")
], JobType);
exports.JobType = JobType;
