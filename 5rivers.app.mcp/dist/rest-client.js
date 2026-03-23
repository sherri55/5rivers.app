/**
 * REST client for 5rivers.app backend API.
 * Replaces the old GraphQL client — used by both MCP tools and the agent.
 */
export function createRestClient(config) {
    const { baseUrl, authToken } = config;
    /** Returns a new client instance using a different token — for per-request auth. */
    function withToken(token) {
        return createRestClient({ baseUrl, authToken: token });
    }
    async function request(method, path, body, queryParams) {
        const url = new URL(`${baseUrl}${path}`);
        if (queryParams) {
            for (const [k, v] of Object.entries(queryParams)) {
                if (v !== undefined && v !== null && v !== '') {
                    url.searchParams.set(k, String(v));
                }
            }
        }
        const headers = {
            'Content-Type': 'application/json',
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        const res = await fetch(url.toString(), {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status === 204)
            return undefined;
        const json = await res.json();
        if (!res.ok) {
            const msg = json?.error?.message ||
                json?.error?.code ||
                json?.message ||
                (typeof json?.error === 'string' ? json.error : null) ||
                `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return json;
    }
    function buildListQuery(params) {
        if (!params)
            return {};
        const q = {};
        if (params.page)
            q.page = params.page;
        if (params.limit)
            q.limit = params.limit;
        if (params.sortBy)
            q.sortBy = params.sortBy;
        if (params.order)
            q.order = params.order;
        if (params.search)
            q.filter_search = params.search;
        if (params.filters) {
            for (const [k, v] of Object.entries(params.filters)) {
                q[`filter_${k}`] = v;
            }
        }
        return q;
    }
    // ── CRUD factory ──────────────────────────────────────────
    function crudFor(resource) {
        return {
            list: (params) => request('GET', `/${resource}`, undefined, buildListQuery(params)),
            get: (id) => request('GET', `/${resource}/${id}`),
            create: (data) => request('POST', `/${resource}`, data),
            update: (id, data) => request('PATCH', `/${resource}/${id}`, data),
            delete: (id) => request('DELETE', `/${resource}/${id}`),
        };
    }
    const jobs = crudFor('jobs');
    const jobTypes = crudFor('job-types');
    const drivers = crudFor('drivers');
    const companies = crudFor('companies');
    const dispatchers = crudFor('dispatchers');
    const units = crudFor('units');
    const carriers = crudFor('carriers');
    const invoices = crudFor('invoices');
    const expenses = crudFor('expenses');
    const expenseCategories = crudFor('expense-categories');
    // ── Analytics ─────────────────────────────────────────────
    const analytics = {
        dashboard: () => request('GET', '/analytics/dashboard'),
        dailyRevenue: (days) => request('GET', '/analytics/revenue/daily', undefined, { days }),
        monthlyRevenue: (months) => request('GET', '/analytics/revenue/monthly', undefined, { months }),
        revenueByCompany: (startDate, endDate) => request('GET', '/analytics/revenue/by-company', undefined, { startDate, endDate }),
        revenueByDriver: (startDate, endDate) => request('GET', '/analytics/revenue/by-driver', undefined, { startDate, endDate }),
        expensesByCategory: (startDate, endDate) => request('GET', '/analytics/expenses/by-category', undefined, { startDate, endDate }),
        monthlyExpenses: (months) => request('GET', '/analytics/expenses/monthly', undefined, { months }),
        monthlyProfit: (months) => request('GET', '/analytics/profit/monthly', undefined, { months }),
        topJobTypes: (startDate, endDate, limit) => request('GET', '/analytics/top-job-types', undefined, { startDate, endDate, limit }),
        paymentStatus: (startDate, endDate) => request('GET', '/analytics/payment-status', undefined, { startDate, endDate }),
    };
    // ── Invoice extras ────────────────────────────────────────
    const invoiceExtras = {
        nextNumber: () => request('GET', '/invoices/next-number'),
    };
    return {
        jobs,
        jobTypes,
        drivers,
        companies,
        dispatchers,
        units,
        carriers,
        invoices,
        invoiceExtras,
        expenses,
        expenseCategories,
        analytics,
        withToken,
        login: (email, password, organizationSlug) => request('POST', '/auth/login', { email, password, organizationSlug }),
    };
}
