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
exports.Driver = void 0;
// src/entities/Driver.ts
const typeorm_1 = require("typeorm");
let Driver = class Driver {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid", { name: "driverId" }) // primary key
    ,
    __metadata("design:type", String)
], Driver.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "name", length: 255 }),
    __metadata("design:type", String)
], Driver.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "description", length: 255, nullable: true }),
    __metadata("design:type", String)
], Driver.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "email", length: 255, nullable: true }),
    __metadata("design:type", String)
], Driver.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "phone", length: 255, nullable: true }),
    __metadata("design:type", String)
], Driver.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "hourlyRate", type: "float", default: 0 }),
    __metadata("design:type", Number)
], Driver.prototype, "hourlyRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "isActive", type: "bit", default: true }),
    __metadata("design:type", Boolean)
], Driver.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "createdAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Driver.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updatedAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Driver.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)({ name: "rowVersion" }),
    __metadata("design:type", Buffer)
], Driver.prototype, "rowVersion", void 0);
Driver = __decorate([
    (0, typeorm_1.Entity)("Drivers")
], Driver);
exports.Driver = Driver;
