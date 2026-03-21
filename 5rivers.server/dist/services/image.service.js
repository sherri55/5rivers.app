"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listImagesByJob = listImagesByJob;
exports.getImageById = getImageById;
exports.createImage = createImage;
exports.deleteImage = deleteImage;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const job_service_1 = require("./job.service");
async function listImagesByJob(jobId, organizationId) {
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        return [];
    const rows = await (0, connection_1.query)(`SELECT id, jobId, contentType, fileName, createdAt
     FROM Images
     WHERE jobId = @jobId
     ORDER BY createdAt`, { params: { jobId } });
    return Array.isArray(rows) ? rows : [];
}
async function getImageById(imageId, jobId, organizationId) {
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        return null;
    const rows = await (0, connection_1.query)(`SELECT id, jobId, content, contentType, fileName, createdAt
     FROM Images
     WHERE id = @imageId AND jobId = @jobId`, { params: { imageId, jobId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createImage(organizationId, jobId, content, contentType, fileName) {
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        throw new Error('Job not found');
    const id = (0, uuid_1.v4)();
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO Images (id, jobId, content, contentType, fileName, createdAt)
     VALUES (@id, @jobId, @content, @contentType, @fileName, @createdAt)`, {
        params: {
            id,
            jobId,
            content,
            contentType: contentType || 'application/octet-stream',
            fileName: fileName ?? null,
            createdAt: now,
        },
    });
    const list = await listImagesByJob(jobId, organizationId);
    const meta = list.find((m) => m.id === id);
    if (!meta)
        throw new Error('Failed to create image');
    return meta;
}
async function deleteImage(imageId, jobId, organizationId) {
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        return false;
    const rows = await (0, connection_1.query)(`SELECT id FROM Images WHERE id = @imageId AND jobId = @jobId`, { params: { imageId, jobId } });
    if (!Array.isArray(rows) || rows.length === 0)
        return false;
    await (0, connection_1.query)(`DELETE FROM Images WHERE id = @imageId AND jobId = @jobId`, {
        params: { imageId, jobId },
    });
    return true;
}
