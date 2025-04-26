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
exports.Invoice = void 0;
// src/entities/Invoice.ts
const typeorm_1 = require("typeorm");
const InvoiceLine_1 = require("./InvoiceLine");
let Invoice = class Invoice {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid", { name: "invoiceId" }) // primary key
    ,
    __metadata("design:type", String)
], Invoice.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "invoiceNumber", length: 255, unique: true }),
    __metadata("design:type", String)
], Invoice.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "invoiceDate", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Invoice.prototype, "invoiceDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "subTotal", type: "float", default: 0 }),
    __metadata("design:type", Number)
], Invoice.prototype, "subTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "dispatchPercent", type: "float", default: 0 }),
    __metadata("design:type", Number)
], Invoice.prototype, "dispatchPercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "comm", type: "float", default: 0 }),
    __metadata("design:type", Number)
], Invoice.prototype, "comm", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "hst", type: "float", default: 0 }),
    __metadata("design:type", Number)
], Invoice.prototype, "hst", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "total", type: "float", default: 0 }),
    __metadata("design:type", Number)
], Invoice.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "billedTo", length: 255, nullable: true }),
    __metadata("design:type", String)
], Invoice.prototype, "billedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "billedEmail", length: 255, nullable: true }),
    __metadata("design:type", String)
], Invoice.prototype, "billedEmail", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "createdAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Invoice.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updatedAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Invoice.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "isActive", type: "bit", default: true }),
    __metadata("design:type", Boolean)
], Invoice.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)({ name: "rowVersion" }),
    __metadata("design:type", Buffer)
], Invoice.prototype, "rowVersion", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => InvoiceLine_1.InvoiceLine, (line) => line.invoice),
    __metadata("design:type", Array)
], Invoice.prototype, "lines", void 0);
Invoice = __decorate([
    (0, typeorm_1.Entity)("Invoices")
], Invoice);
exports.Invoice = Invoice;
