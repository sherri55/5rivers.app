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
exports.Unit = void 0;
// src/entities/Unit.ts
const typeorm_1 = require("typeorm");
let Unit = class Unit {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid", { name: "unitId" }),
    __metadata("design:type", String)
], Unit.prototype, "unitId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "name", length: 255 }),
    __metadata("design:type", String)
], Unit.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "description", length: 255, nullable: true }),
    __metadata("design:type", String)
], Unit.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "createdAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Unit.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updatedAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Unit.prototype, "updatedAt", void 0);
Unit = __decorate([
    (0, typeorm_1.Entity)("Units")
], Unit);
exports.Unit = Unit;
