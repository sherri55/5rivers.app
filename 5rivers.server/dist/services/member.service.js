"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMembers = listMembers;
exports.addMember = addMember;
exports.updateMember = updateMember;
exports.removeMember = removeMember;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const auth_service_1 = require("./auth.service");
const SORT_COLUMNS = ['email', 'name', 'role', 'createdAt'];
const FILTER_COLUMNS = ['email', 'name', 'role'];
async function listMembers(organizationId, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'email';
    const order = options?.order === 'desc' ? 'DESC' : 'ASC';
    const sortCol = sortBy === 'name' || sortBy === 'email' ? `u.${sortBy}` : sortBy === 'createdAt' ? 'om.createdAt' : 'om.role';
    const filterClauses = [];
    const params = { organizationId };
    if (options?.filters) {
        for (const col of FILTER_COLUMNS) {
            const v = options.filters[col];
            if (v) {
                const field = col === 'name' || col === 'email' ? `u.${col}` : 'om.role';
                filterClauses.push(`(${field} IS NOT NULL AND ${field} LIKE @filter_${col} ESCAPE '\\')`);
                params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
            }
        }
    }
    const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const rows = await (0, connection_1.query)(`SELECT om.userId, om.organizationId, om.role, u.email, u.name,
            CONVERT(VARCHAR(24), om.createdAt, 126) AS createdAt
     FROM OrganizationMember om
     INNER JOIN Users u ON u.id = om.userId
     WHERE om.organizationId = @organizationId${whereExtra}
     ORDER BY ${sortCol} ${order}`, { params });
    return Array.isArray(rows) ? rows : [];
}
/** Add a member to the org. Creates user if not exists (password required for new users). */
async function addMember(organizationId, input) {
    const email = input.email.trim().toLowerCase();
    if (!email) {
        throw new Error('email is required');
    }
    let userId;
    const existing = await (0, connection_1.query)(`SELECT id FROM Users WHERE email = @email`, { params: { email } });
    if (Array.isArray(existing) && existing.length > 0) {
        userId = existing[0].id;
    }
    else {
        if (!input.password?.trim()) {
            throw new Error('password is required when creating a new user');
        }
        userId = (0, uuid_1.v4)();
        const passwordHash = await (0, auth_service_1.hashPassword)(input.password.trim());
        const name = (input.name ?? '').trim() || null;
        await (0, connection_1.query)(`INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
       VALUES (@userId, @email, @passwordHash, @name, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2), CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2))`, {
            params: {
                userId,
                email,
                passwordHash,
                name,
            },
        });
    }
    const alreadyMember = await (0, connection_1.query)(`SELECT userId FROM OrganizationMember WHERE userId = @userId AND organizationId = @organizationId`, { params: { userId, organizationId } });
    if (Array.isArray(alreadyMember) && alreadyMember.length > 0) {
        throw new Error('User is already a member of this organization');
    }
    await (0, connection_1.query)(`INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
     VALUES (@userId, @organizationId, @role, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2))`, {
        params: {
            userId,
            organizationId,
            role: input.role,
        },
    });
    const members = await listMembers(organizationId);
    const member = members.find((m) => m.userId === userId);
    if (!member)
        throw new Error('Failed to load created member');
    return member;
}
async function updateMember(organizationId, userId, input) {
    if (input.role !== undefined) {
        await (0, connection_1.query)(`UPDATE OrganizationMember SET role = @role
       WHERE userId = @userId AND organizationId = @organizationId`, { params: { userId, organizationId, role: input.role } });
    }
    if (input.name !== undefined) {
        await (0, connection_1.query)(`UPDATE Users SET name = @name, updatedAt = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2) WHERE id = @userId`, { params: { userId, name: (input.name ?? '').trim() || null } });
    }
    const members = await listMembers(organizationId);
    return members.find((m) => m.userId === userId) ?? null;
}
async function removeMember(organizationId, userId) {
    const existing = await (0, connection_1.query)(`SELECT userId FROM OrganizationMember WHERE userId = @userId AND organizationId = @organizationId`, { params: { userId, organizationId } });
    if (!Array.isArray(existing) || existing.length === 0) {
        return false;
    }
    await (0, connection_1.query)(`DELETE FROM OrganizationMember WHERE userId = @userId AND organizationId = @organizationId`, { params: { userId, organizationId } });
    return true;
}
