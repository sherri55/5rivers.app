"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCompanies = listCompanies;
exports.getCompanyById = getCompanyById;
exports.createCompany = createCompany;
exports.updateCompany = updateCompany;
exports.deleteCompany = deleteCompany;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const SORT_COLUMNS = ['name', 'description', 'email', 'phone', 'createdAt'];
const FILTER_COLUMNS = ['name', 'description', 'email', 'phone'];
async function listCompanies(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'name';
    const order = options?.order === 'desc' ? 'DESC' : 'ASC';
    const filterClauses = [];
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (options?.filters) {
        const searchTerm = options.filters['search'];
        if (searchTerm) {
            const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
            params['filter_search'] = `%${escaped}%`;
            filterClauses.push(`(
        (name LIKE @filter_search ESCAPE '\\')
        OR (description IS NOT NULL AND description LIKE @filter_search ESCAPE '\\')
        OR (email IS NOT NULL AND email LIKE @filter_search ESCAPE '\\')
        OR (phone IS NOT NULL AND phone LIKE @filter_search ESCAPE '\\')
        OR (website IS NOT NULL AND website LIKE @filter_search ESCAPE '\\')
        OR (industry IS NOT NULL AND industry LIKE @filter_search ESCAPE '\\')
        OR (location IS NOT NULL AND location LIKE @filter_search ESCAPE '\\')
      )`);
        }
        for (const col of FILTER_COLUMNS) {
            const v = options.filters[col];
            if (v) {
                filterClauses.push(`(${col} IS NOT NULL AND ${col} LIKE @filter_${col} ESCAPE '\\')`);
                params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
            }
        }
    }
    const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const countParams = { organizationId };
    if (params['filter_search'] != null)
        countParams['filter_search'] = params['filter_search'];
    FILTER_COLUMNS.forEach((col) => {
        if (params[`filter_${col}`] != null)
            countParams[`filter_${col}`] = params[`filter_${col}`];
    });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt
       FROM Companies
       WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Companies WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
    ]);
    const total = countRows[0]?.total ?? 0;
    return {
        data: Array.isArray(rows) ? rows : [],
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit) || 1,
    };
}
async function getCompanyById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt
     FROM Companies WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createCompany(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO Companies (id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @website, @industry, @location, @size, @founded, @logo, @email, @phone, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            name: input.name,
            description: input.description ?? null,
            website: input.website ?? null,
            industry: input.industry ?? null,
            location: input.location ?? null,
            size: input.size ?? null,
            founded: input.founded ?? null,
            logo: input.logo ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            createdAt: now,
            updatedAt: now,
        },
    });
    const company = await getCompanyById(id, organizationId);
    if (!company)
        throw new Error('Failed to create company');
    return company;
}
async function updateCompany(organizationId, input) {
    const existing = await getCompanyById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id,
        organizationId,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        website: input.website !== undefined ? input.website : existing.website,
        industry: input.industry !== undefined ? input.industry : existing.industry,
        location: input.location !== undefined ? input.location : existing.location,
        size: input.size !== undefined ? input.size : existing.size,
        founded: input.founded !== undefined ? input.founded : existing.founded,
        logo: input.logo !== undefined ? input.logo : existing.logo,
        email: input.email !== undefined ? input.email : existing.email,
        phone: input.phone !== undefined ? input.phone : existing.phone,
        updatedAt: new Date(),
    };
    await (0, connection_1.query)(`UPDATE Companies SET
       name = @name, description = @description, website = @website, industry = @industry,
       location = @location, size = @size, founded = @founded, logo = @logo, email = @email, phone = @phone, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getCompanyById(input.id, organizationId);
}
async function deleteCompany(id, organizationId) {
    const existing = await getCompanyById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Companies WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
