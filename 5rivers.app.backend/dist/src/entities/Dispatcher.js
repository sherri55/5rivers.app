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
exports.Dispatcher = void 0;
// src/entities/Dispatcher.ts
const typeorm_1 = require("typeorm");
let Dispatcher = class Dispatcher {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid", { name: "dispatcherId" }) // primary key
    ,
    __metadata("design:type", String)
], Dispatcher.prototype, "dispatcherId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "name", length: 255 }),
    __metadata("design:type", String)
], Dispatcher.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "description", length: 255, nullable: true }),
    __metadata("design:type", String)
], Dispatcher.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "email", length: 255, nullable: true }),
    __metadata("design:type", String)
], Dispatcher.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "phone", length: 255, nullable: true }),
    __metadata("design:type", String)
], Dispatcher.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "isActive", type: "bit", default: true }),
    __metadata("design:type", Boolean)
], Dispatcher.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "commission", type: "float", default: 0 }),
    __metadata("design:type", Number)
], Dispatcher.prototype, "commission", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "createdAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Dispatcher.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updatedAt", type: "datetimeoffset" }),
    __metadata("design:type", Date)
], Dispatcher.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)({ name: "rowVersion" }),
    __metadata("design:type", Buffer)
], Dispatcher.prototype, "rowVersion", void 0);
Dispatcher = __decorate([
    (0, typeorm_1.Entity)("Dispatchers")
], Dispatcher);
exports.Dispatcher = Dispatcher;
