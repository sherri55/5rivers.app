"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInquiry = createInquiry;
exports.getInquiryById = getInquiryById;
exports.listInquiries = listInquiries;
exports.updateInquiry = updateInquiry;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const SORT_COLUMNS = ['fullName', 'email', 'serviceType', 'status', 'createdAt'];
const ALL_COLUMNS = 'id, fullName, email, phone, serviceType, projectDetails, status, source, notes, userAgent, ipAddress, createdAt, updatedAt';
async function createInquiry(input) {
    const id = (0, uuid_1.v4)();
    await (0, connection_1.query)(`INSERT INTO Inquiries
       (id, fullName, email, phone, serviceType, projectDetails, userAgent, ipAddress)
     VALUES
       (@id, @fullName, @email, @phone, @serviceType, @projectDetails, @userAgent, @ipAddress)`, {
        params: {
            id,
            fullName: input.fullName,
            email: input.email,
            phone: input.phone ?? null,
            serviceType: input.serviceType,
            projectDetails: input.projectDetails ?? null,
            userAgent: input.userAgent ?? null,
            ipAddress: input.ipAddress ?? null,
        },
    });
    const created = await getInquiryById(id);
    if (!created)
        throw new Error('Inquiry insert succeeded but row not found');
    return created;
}
async function getInquiryById(id) {
    const rows = await (0, connection_1.query)(`SELECT ${ALL_COLUMNS} FROM Inquiries WHERE id = @id`, { params: { id } });
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
}
async function listInquiries(pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy)
        ? options.sortBy
        : 'createdAt';
    const order = options?.order === 'asc' ? 'ASC' : 'DESC';
    const params = {
        offset: pagination.offset,
        limit: pagination.limit,
    };
    const whereClauses = [];
    if (options?.status) {
        whereClauses.push('status = @status');
        params.status = options.status;
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT ${ALL_COLUMNS} FROM Inquiries ${where}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Inquiries ${where}`, { params: options?.status ? { status: options.status } : {} }),
    ]);
    const total = countRows[0]?.total ?? 0;
    return {
        data: Array.isArray(rows) ? rows : [],
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    };
}
async function updateInquiry(input) {
    const sets = [];
    const params = { id: input.id };
    if (input.status !== undefined) {
        sets.push('status = @status');
        params.status = input.status;
    }
    if (input.notes !== undefined) {
        sets.push('notes = @notes');
        params.notes = input.notes;
    }
    if (sets.length === 0)
        return getInquiryById(input.id);
    sets.push('updatedAt = GETUTCDATE()');
    await (0, connection_1.query)(`UPDATE Inquiries SET ${sets.join(', ')} WHERE id = @id`, { params });
    return getInquiryById(input.id);
}
