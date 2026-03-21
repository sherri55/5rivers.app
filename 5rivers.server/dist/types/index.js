"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = void 0;
exports.parseListOptions = parseListOptions;
exports.normalizePagination = normalizePagination;
/** Parse sort + filter from request query. Use filter_name=... for filters. */
function parseListOptions(query) {
    const sortBy = typeof query.sortBy === 'string' ? query.sortBy.trim() : undefined;
    const order = query.order === 'asc' || query.order === 'desc' ? query.order : undefined;
    const filters = {};
    for (const [k, v] of Object.entries(query)) {
        if (k.startsWith('filter_') && typeof v === 'string' && v.trim())
            filters[k.slice(7)] = v.trim();
    }
    return { sortBy, order, filters };
}
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
function normalizePagination(params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(exports.MAX_PAGE_SIZE, Math.max(1, params.limit ?? exports.DEFAULT_PAGE_SIZE));
    const offset = params.offset ?? (page - 1) * limit;
    return { page, limit, offset };
}
