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
exports.InvoiceLine = void 0;
// src/entities/InvoiceLine.ts
const typeorm_1 = require("typeorm");
const Invoice_1 = require("./Invoice");
const Job_1 = require("./Job");
let InvoiceLine = class InvoiceLine {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], InvoiceLine.prototype, "invoiceLineId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0 }),
    __metadata("design:type", Number)
], InvoiceLine.prototype, "lineAmount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: "datetimeoffset" }),
    __metadata("design:type", Date)
], InvoiceLine.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: "datetimeoffset" }),
    __metadata("design:type", Date)
], InvoiceLine.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], InvoiceLine.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)(),
    __metadata("design:type", Buffer)
], InvoiceLine.prototype, "rowVersion", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Invoice_1.Invoice, (invoice) => invoice.lines, { onDelete: "CASCADE" }),
    __metadata("design:type", Invoice_1.Invoice)
], InvoiceLine.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Job_1.Job, (job) => job.invoice, { onDelete: "SET NULL" }),
    __metadata("design:type", Job_1.Job)
], InvoiceLine.prototype, "job", void 0);
InvoiceLine = __decorate([
    (0, typeorm_1.Entity)("InvoiceLines")
], InvoiceLine);
exports.InvoiceLine = InvoiceLine;
