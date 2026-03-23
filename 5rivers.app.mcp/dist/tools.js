function json(data) {
    return JSON.stringify(data, null, 2);
}
function parseDateArg(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
// ── Read Tools ──────────────────────────────────────────────
const list_jobs = {
    name: 'list_jobs',
    description: 'List jobs with optional filters. Use for "show me jobs for today", "jobs from March 1 to 15", "pending jobs", "jobs for driver X". Returns paginated job list with date, amount, driver, status.',
    inputSchema: {
        type: 'object',
        properties: {
            date: { type: 'string', description: 'Single date — returns jobs on that day. Accepts "2025-02-12", "12th feb 2025", etc.' },
            dateFrom: { type: 'string', description: 'Start date for range filter.' },
            dateTo: { type: 'string', description: 'End date for range filter.' },
            driverId: { type: 'string', description: 'Filter by driver ID.' },
            jobTypeId: { type: 'string', description: 'Filter by job type ID.' },
            search: { type: 'string', description: 'Search term (ticket IDs, etc.).' },
            limit: { type: 'number', description: 'Max results (default 50, max 100).', default: 50 },
            page: { type: 'number', description: 'Page number (default 1).', default: 1 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.date) {
            const d = parseDateArg(String(args.date));
            filters.jobDate = d;
        }
        else {
            if (args.dateFrom)
                filters.dateFrom = parseDateArg(String(args.dateFrom));
            if (args.dateTo)
                filters.dateTo = parseDateArg(String(args.dateTo));
        }
        if (args.driverId)
            filters.driverId = String(args.driverId);
        if (args.jobTypeId)
            filters.jobTypeId = String(args.jobTypeId);
        const result = await client.jobs.list({
            page: Number(args.page) || 1,
            limit: Math.min(Number(args.limit) || 50, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No jobs found for the given filters.';
        return json({ total: result.total, page: result.page, totalPages: result.totalPages, jobs: result.data });
    },
};
const get_job = {
    name: 'get_job',
    description: 'Get a single job by ID. Use when the user asks for details of a specific job.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const job = await client.jobs.get(String(args.id));
        return job ? json(job) : 'Job not found.';
    },
};
const search_jobs = {
    name: 'search_jobs',
    description: 'Search jobs by text (ticket ID, company name, etc.). Use for "search jobs for ticket 4521".',
    inputSchema: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query.' },
            limit: { type: 'number', default: 20 },
        },
        required: ['query'],
    },
    handler: async (client, args) => {
        const result = await client.jobs.list({
            search: String(args.query),
            limit: Math.min(Number(args.limit) || 20, 100),
        });
        if (result.data.length === 0)
            return 'No jobs matched the search.';
        return json({ total: result.total, jobs: result.data });
    },
};
const get_dashboard_stats = {
    name: 'get_dashboard_stats',
    description: 'Get dashboard summary: total jobs, revenue, expenses, profit, invoices. Use for "dashboard", "summary", "overview", "how many jobs this month", "what\'s our revenue".',
    inputSchema: {
        type: 'object',
        properties: {},
    },
    handler: async (client) => {
        const stats = await client.analytics.dashboard();
        return json(stats);
    },
};
const list_invoices = {
    name: 'list_invoices',
    description: 'List invoices with optional filters. Use for "show invoices", "unpaid invoices", "invoices for February".',
    inputSchema: {
        type: 'object',
        properties: {
            status: { type: 'string', description: 'Filter by status (e.g. PENDING, PAID, SENT).' },
            search: { type: 'string', description: 'Search term.' },
            limit: { type: 'number', default: 20 },
            page: { type: 'number', default: 1 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.status)
            filters.status = String(args.status);
        const result = await client.invoices.list({
            page: Number(args.page) || 1,
            limit: Math.min(Number(args.limit) || 20, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No invoices found.';
        return json({ total: result.total, page: result.page, invoices: result.data });
    },
};
const list_drivers = {
    name: 'list_drivers',
    description: 'List all drivers. Use for "list drivers", "show drivers", "who are our drivers".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.drivers.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No drivers found.';
        return json({ total: result.total, drivers: result.data });
    },
};
const list_companies = {
    name: 'list_companies',
    description: 'List all companies. Use for "show companies", "list companies".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.companies.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No companies found.';
        return json({ total: result.total, companies: result.data });
    },
};
const list_dispatchers = {
    name: 'list_dispatchers',
    description: 'List all dispatchers. Use for "list dispatchers", "show dispatchers".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.dispatchers.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No dispatchers found.';
        return json({ total: result.total, dispatchers: result.data });
    },
};
const list_units = {
    name: 'list_units',
    description: 'List all units (trucks/vehicles). Use for "list units", "show trucks".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.units.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No units found.';
        return json({ total: result.total, units: result.data });
    },
};
const list_carriers = {
    name: 'list_carriers',
    description: 'List all carriers. Use for "list carriers", "show carriers".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.carriers.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No carriers found.';
        return json({ total: result.total, carriers: result.data });
    },
};
const list_job_types = {
    name: 'list_job_types',
    description: 'List job types, optionally filtered by company. Use for "show job types", "what job types does company X have".',
    inputSchema: {
        type: 'object',
        properties: {
            companyId: { type: 'string', description: 'Filter by company ID.' },
            search: { type: 'string', description: 'Search by title.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.companyId)
            filters.companyId = String(args.companyId);
        const result = await client.jobTypes.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No job types found.';
        return json({ total: result.total, jobTypes: result.data });
    },
};
const list_expenses = {
    name: 'list_expenses',
    description: 'List expenses with optional filters. Use for "show expenses", "expenses this month", "fuel expenses".',
    inputSchema: {
        type: 'object',
        properties: {
            categoryId: { type: 'string', description: 'Filter by expense category ID.' },
            search: { type: 'string', description: 'Search description/vendor.' },
            startDate: { type: 'string', description: 'Start date filter.' },
            endDate: { type: 'string', description: 'End date filter.' },
            limit: { type: 'number', default: 20 },
            page: { type: 'number', default: 1 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.categoryId)
            filters.categoryId = String(args.categoryId);
        if (args.startDate)
            filters.startDate = parseDateArg(String(args.startDate));
        if (args.endDate)
            filters.endDate = parseDateArg(String(args.endDate));
        const result = await client.expenses.list({
            page: Number(args.page) || 1,
            limit: Math.min(Number(args.limit) || 20, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No expenses found.';
        return json({ total: result.total, page: result.page, expenses: result.data });
    },
};
const list_expense_categories = {
    name: 'list_expense_categories',
    description: 'List expense categories. Use for "show expense categories", "what categories do we have".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
        },
    },
    handler: async (client, args) => {
        const result = await client.expenseCategories.list({
            limit: 100,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No expense categories found.';
        return json({ total: result.total, categories: result.data });
    },
};
const get_monthly_profit = {
    name: 'get_monthly_profit',
    description: 'Get monthly profit breakdown (revenue, expenses, profit per month). Use for "monthly profit", "revenue vs expenses", "profit margin".',
    inputSchema: {
        type: 'object',
        properties: {
            months: { type: 'number', description: 'Number of months to look back (default 12).', default: 12 },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.monthlyProfit(Number(args.months) || 12);
        return json(data);
    },
};
const get_expenses_by_category = {
    name: 'get_expenses_by_category',
    description: 'Get expense breakdown by category. Use for "expenses by category", "how much on fuel", "top expenses".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date.' },
            endDate: { type: 'string', description: 'End date.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.expensesByCategory(args.startDate ? parseDateArg(String(args.startDate)) : undefined, args.endDate ? parseDateArg(String(args.endDate)) : undefined);
        return json(data);
    },
};
// ── Write Tools ─────────────────────────────────────────────
const create_job = {
    name: 'create_job',
    description: 'Create a new job. Requires jobDate and jobTypeId at minimum. Use after confirming details with the user.',
    inputSchema: {
        type: 'object',
        properties: {
            jobDate: { type: 'string', description: 'Job date (YYYY-MM-DD).' },
            jobTypeId: { type: 'string', description: 'Job type ID.' },
            driverId: { type: 'string', description: 'Driver ID.' },
            dispatcherId: { type: 'string', description: 'Dispatcher ID.' },
            unitId: { type: 'string', description: 'Unit/truck ID.' },
            carrierId: { type: 'string', description: 'Carrier ID.' },
            sourceType: { type: 'string', enum: ['DISPATCHED', 'DIRECT'], description: 'Source type.' },
            startTime: { type: 'string', description: 'Start time (HH:MM or HH:MM AM/PM).' },
            endTime: { type: 'string', description: 'End time (HH:MM or HH:MM AM/PM).' },
            weight: { type: 'string', description: 'Weight.' },
            loads: { type: 'number', description: 'Number of loads.' },
            amount: { type: 'number', description: 'Job amount in dollars.' },
            ticketIds: { type: 'string', description: 'Comma-separated ticket IDs.' },
        },
        required: ['jobDate', 'jobTypeId'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'jobDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const job = await client.jobs.create(data);
        return `Job created successfully:\n${json(job)}`;
    },
};
const update_job = {
    name: 'update_job',
    description: 'Update an existing job. Use for "change end time", "update job amount", etc.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID to update.' },
            jobDate: { type: 'string', description: 'New job date.' },
            jobTypeId: { type: 'string', description: 'New job type ID.' },
            driverId: { type: 'string', description: 'New driver ID.' },
            dispatcherId: { type: 'string', description: 'New dispatcher ID.' },
            unitId: { type: 'string', description: 'New unit ID.' },
            startTime: { type: 'string', description: 'New start time.' },
            endTime: { type: 'string', description: 'New end time.' },
            amount: { type: 'number', description: 'New amount.' },
            weight: { type: 'string', description: 'New weight.' },
            loads: { type: 'number', description: 'New loads count.' },
            jobPaid: { type: 'boolean', description: 'Mark job as paid/received from client.' },
            driverPaid: { type: 'boolean', description: 'Mark driver as paid for this job.' },
            notes: { type: 'string', description: 'Job notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const id = String(args.id);
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (k !== 'id' && v !== undefined && v !== null && v !== '') {
                if (k === 'jobDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const job = await client.jobs.update(id, data);
        return `Job updated successfully:\n${json(job)}`;
    },
};
const create_job_type = {
    name: 'create_job_type',
    description: 'Create a new job type for a company. Use for "add job type hourly $85/hr for company X".',
    inputSchema: {
        type: 'object',
        properties: {
            companyId: { type: 'string', description: 'Company ID this job type belongs to.' },
            title: { type: 'string', description: 'Job type title (e.g. "Hourly", "Flat Rate", "Tonnage").' },
            rateOfJob: { type: 'number', description: 'Rate for the job type (e.g. 85 for $85/hr).' },
            dispatchType: { type: 'string', description: 'How dispatch works for this type.' },
        },
        required: ['companyId', 'title'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const jt = await client.jobTypes.create(data);
        return `Job type created successfully:\n${json(jt)}`;
    },
};
const create_driver = {
    name: 'create_driver',
    description: 'Create a new driver. Use for "add driver Mike Johnson hourly rate $25".',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Driver full name.' },
            hourlyRate: { type: 'number', description: 'Hourly rate in dollars.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const driver = await client.drivers.create(data);
        return `Driver created successfully:\n${json(driver)}`;
    },
};
const create_company = {
    name: 'create_company',
    description: 'Create a new company. Use for "add company Metro Hauling".',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Company name.' },
            email: { type: 'string', description: 'Contact email.' },
            phone: { type: 'string', description: 'Contact phone.' },
            address: { type: 'string', description: 'Company address.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const company = await client.companies.create(data);
        return `Company created successfully:\n${json(company)}`;
    },
};
const create_dispatcher = {
    name: 'create_dispatcher',
    description: 'Create a new dispatcher. Use for "add dispatcher Sarah Williams".',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Dispatcher full name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const d = await client.dispatchers.create(data);
        return `Dispatcher created successfully:\n${json(d)}`;
    },
};
const create_unit = {
    name: 'create_unit',
    description: 'Create a new unit (truck/vehicle). Use for "add unit T-105".',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Unit name/number (e.g. T-105).' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const unit = await client.units.create(data);
        return `Unit created successfully:\n${json(unit)}`;
    },
};
const create_carrier = {
    name: 'create_carrier',
    description: 'Create a new carrier. Use for "add carrier FastFreight Inc".',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Carrier name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const c = await client.carriers.create(data);
        return `Carrier created successfully:\n${json(c)}`;
    },
};
const create_expense = {
    name: 'create_expense',
    description: 'Create a new expense. Use for "add expense $500 truck maintenance today", "add recurring monthly expense $1200 office rent".',
    inputSchema: {
        type: 'object',
        properties: {
            description: { type: 'string', description: 'Expense description.' },
            amount: { type: 'number', description: 'Amount in dollars.' },
            expenseDate: { type: 'string', description: 'Expense date (YYYY-MM-DD).' },
            categoryId: { type: 'string', description: 'Expense category ID.' },
            vendor: { type: 'string', description: 'Vendor/payee name.' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'CREDIT_CARD', 'OTHER'], description: 'Payment method.' },
            reference: { type: 'string', description: 'Reference number.' },
            notes: { type: 'string', description: 'Additional notes.' },
            recurring: { type: 'boolean', description: 'Is this a recurring expense?' },
            recurringFrequency: { type: 'string', enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], description: 'Recurrence frequency.' },
        },
        required: ['description', 'amount', 'expenseDate'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'expenseDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const expense = await client.expenses.create(data);
        return `Expense created successfully:\n${json(expense)}`;
    },
};
const create_expense_category = {
    name: 'create_expense_category',
    description: 'Create a new expense category. Use for "create category Insurance", "add expense category Fuel".',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Category name.' },
            description: { type: 'string', description: 'Category description.' },
            color: { type: 'string', description: 'Color hex code (e.g. #3B82F6).' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const cat = await client.expenseCategories.create(data);
        return `Expense category created successfully:\n${json(cat)}`;
    },
};
const create_invoice = {
    name: 'create_invoice',
    description: 'Create a new invoice. Use for "create invoice for dispatcher Mike dated today".',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD).' },
            dispatcherId: { type: 'string', description: 'Dispatcher ID (required if not companyId).' },
            companyId: { type: 'string', description: 'Company ID (required if not dispatcherId).' },
            notes: { type: 'string', description: 'Invoice notes.' },
        },
        required: ['invoiceDate'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'invoiceDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const inv = await client.invoices.create(data);
        return `Invoice created successfully:\n${json(inv)}`;
    },
};
// ── Update tools ────────────────────────────────────────────
const update_invoice = {
    name: 'update_invoice',
    description: 'Update an invoice status or details. Use for "mark invoice as received" (payment received from client), "raise invoice", "mark job as paid". Status flow: CREATED → RAISED → RECEIVED. Setting RECEIVED automatically marks all linked jobs as paid.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Invoice ID.' },
            status: { type: 'string', enum: ['CREATED', 'RAISED', 'RECEIVED'], description: 'Invoice status. RECEIVED = payment received from client, automatically marks linked jobs as paid.' },
            invoiceDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD).' },
            dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD).' },
            notes: { type: 'string', description: 'Invoice notes.' },
            paidAt: { type: 'string', description: 'Date payment was received (YYYY-MM-DD).' },
            paidAmount: { type: 'number', description: 'Amount paid.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'invoiceDate' || k === 'dueDate' || k === 'paidAt')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const inv = await client.invoices.update(String(id), data);
        return `Invoice updated successfully:\n${json(inv)}`;
    },
};
const delete_invoice = {
    name: 'delete_invoice',
    description: 'Delete an invoice by ID. Use with caution.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Invoice ID to delete.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        await client.invoices.delete(String(args.id));
        return `Invoice ${args.id} deleted successfully.`;
    },
};
const get_invoice = {
    name: 'get_invoice',
    description: 'Get full details of a single invoice by ID, including line items and status.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Invoice ID.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const inv = await client.invoices.get(String(args.id));
        return json(inv);
    },
};
const update_driver = {
    name: 'update_driver',
    description: 'Update a driver\'s details. Use for "update driver phone number", "mark driver as inactive".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Driver ID.' },
            name: { type: 'string', description: 'Full name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            licenseNumber: { type: 'string', description: 'License number.' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Driver status.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const driver = await client.drivers.update(String(id), data);
        return `Driver updated successfully:\n${json(driver)}`;
    },
};
const update_company = {
    name: 'update_company',
    description: 'Update a company\'s details. Use for "update company address", "change company contact".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Company ID.' },
            name: { type: 'string', description: 'Company name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            address: { type: 'string', description: 'Address.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const company = await client.companies.update(String(id), data);
        return `Company updated successfully:\n${json(company)}`;
    },
};
const update_unit = {
    name: 'update_unit',
    description: 'Update a unit (truck/trailer). Use for "update unit status", "change unit plate number".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Unit ID.' },
            name: { type: 'string', description: 'Unit name/number.' },
            plateNumber: { type: 'string', description: 'Plate number.' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], description: 'Unit status.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const unit = await client.units.update(String(id), data);
        return `Unit updated successfully:\n${json(unit)}`;
    },
};
const update_carrier = {
    name: 'update_carrier',
    description: 'Update a carrier\'s details.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Carrier ID.' },
            name: { type: 'string', description: 'Carrier name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const carrier = await client.carriers.update(String(id), data);
        return `Carrier updated successfully:\n${json(carrier)}`;
    },
};
const update_dispatcher = {
    name: 'update_dispatcher',
    description: 'Update a dispatcher\'s details.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Dispatcher ID.' },
            name: { type: 'string', description: 'Full name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const dispatcher = await client.dispatchers.update(String(id), data);
        return `Dispatcher updated successfully:\n${json(dispatcher)}`;
    },
};
const delete_job = {
    name: 'delete_job',
    description: 'Delete a job by ID. Use with caution — this is permanent.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID to delete.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        await client.jobs.delete(String(args.id));
        return `Job ${args.id} deleted successfully.`;
    },
};
// ── Driver payments ──────────────────────────────────────────
const list_driver_payments = {
    name: 'list_driver_payments',
    description: 'List driver payments. Use for "show driver payments", "payments for driver Dinesh", "unpaid driver amounts".',
    inputSchema: {
        type: 'object',
        properties: {
            driverId: { type: 'string', description: 'Filter by driver ID.' },
            status: { type: 'string', enum: ['PENDING', 'PAID'], description: 'Filter by payment status.' },
            dateFrom: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            dateTo: { type: 'string', description: 'End date YYYY-MM-DD.' },
            page: { type: 'number', description: 'Page number.' },
            limit: { type: 'number', description: 'Results per page (default 50).' },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.driverId)
            filters.driverId = String(args.driverId);
        if (args.status)
            filters.status = String(args.status);
        if (args.dateFrom)
            filters.dateFrom = String(args.dateFrom);
        if (args.dateTo)
            filters.dateTo = String(args.dateTo);
        const result = await client.driverPayments.list({
            page: args.page ? Number(args.page) : 1,
            limit: args.limit ? Number(args.limit) : 50,
            filters,
        });
        if (result.data.length === 0)
            return 'No driver payments found.';
        return json({ total: result.total, page: result.page, totalPages: result.totalPages, payments: result.data });
    },
};
const create_driver_payment = {
    name: 'create_driver_payment',
    description: 'Record a payment made to a driver. Use for "pay driver Dinesh $500", "record e-transfer payment to John $800".',
    inputSchema: {
        type: 'object',
        properties: {
            driverId: { type: 'string', description: 'Driver ID.' },
            amount: { type: 'number', description: 'Payment amount.' },
            paymentDate: { type: 'string', description: 'Payment date (YYYY-MM-DD).' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'CREDIT_CARD', 'OTHER'], description: 'Payment method.' },
            reference: { type: 'string', description: 'Reference number or cheque number.' },
            notes: { type: 'string', description: 'Notes about this payment.' },
        },
        required: ['driverId', 'amount', 'paymentDate'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'paymentDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const payment = await client.driverPayments.create(data);
        return `Driver payment recorded successfully:\n${json(payment)}`;
    },
};
// ── Job driver pay ───────────────────────────────────────────
const get_job_driver_pay = {
    name: 'get_job_driver_pay',
    description: 'Get the driver pay details for a specific job. Use for "what is the driver pay for job X", "show driver pay breakdown for job".',
    inputSchema: {
        type: 'object',
        properties: {
            jobId: { type: 'string', description: 'Job ID.' },
        },
        required: ['jobId'],
    },
    handler: async (client, args) => {
        const pay = await client.jobDriverPay.get(String(args.jobId));
        return json(pay);
    },
};
const set_job_driver_pay = {
    name: 'set_job_driver_pay',
    description: 'Set or update the driver pay for a specific job. Use for "set driver pay for job X to $250", "update driver pay percentage".',
    inputSchema: {
        type: 'object',
        properties: {
            jobId: { type: 'string', description: 'Job ID.' },
            payType: { type: 'string', enum: ['FIXED', 'PERCENTAGE', 'PER_HOUR', 'PER_MILE'], description: 'Pay calculation type.' },
            amount: { type: 'number', description: 'Fixed amount or percentage value.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['jobId', 'payType', 'amount'],
    },
    handler: async (client, args) => {
        const { jobId, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const pay = await client.jobDriverPay.set(String(jobId), data);
        return `Driver pay set successfully:\n${json(pay)}`;
    },
};
// ── Invoice job management ───────────────────────────────────
const get_next_invoice_number = {
    name: 'get_next_invoice_number',
    description: 'Get the next available invoice number. Use before creating an invoice to get the auto-generated number.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (client) => {
        const result = await client.invoiceExtras.nextNumber();
        return `Next invoice number: ${result.nextNumber}`;
    },
};
const get_invoice_jobs = {
    name: 'get_invoice_jobs',
    description: 'Get all jobs attached to an invoice. Use for "show jobs on invoice INV-001".',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceId: { type: 'string', description: 'Invoice ID.' },
        },
        required: ['invoiceId'],
    },
    handler: async (client, args) => {
        const jobs = await client.invoiceExtras.getJobs(String(args.invoiceId));
        if (!jobs || (Array.isArray(jobs) && jobs.length === 0))
            return 'No jobs attached to this invoice.';
        return json(jobs);
    },
};
const add_job_to_invoice = {
    name: 'add_job_to_invoice',
    description: 'Add a job to an invoice. Use for "add job X to invoice Y", "attach job to invoice".',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceId: { type: 'string', description: 'Invoice ID.' },
            jobId: { type: 'string', description: 'Job ID to add.' },
            amount: { type: 'number', description: 'Override amount for this job on the invoice.' },
        },
        required: ['invoiceId', 'jobId'],
    },
    handler: async (client, args) => {
        const data = { jobId: args.jobId };
        if (args.amount)
            data.amount = args.amount;
        const result = await client.invoiceExtras.addJob(String(args.invoiceId), data);
        return `Job added to invoice successfully:\n${json(result)}`;
    },
};
const remove_job_from_invoice = {
    name: 'remove_job_from_invoice',
    description: 'Remove a job from an invoice.',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceId: { type: 'string', description: 'Invoice ID.' },
            jobId: { type: 'string', description: 'Job ID to remove.' },
        },
        required: ['invoiceId', 'jobId'],
    },
    handler: async (client, args) => {
        await client.invoiceExtras.removeJob(String(args.invoiceId), String(args.jobId));
        return `Job ${args.jobId} removed from invoice ${args.invoiceId} successfully.`;
    },
};
// ── Analytics tools ──────────────────────────────────────────
const get_revenue_by_company = {
    name: 'get_revenue_by_company',
    description: 'Get revenue breakdown by company. Use for "which company generates the most revenue", "revenue by company this month".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.revenueByCompany(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined);
        return json(data);
    },
};
const get_revenue_by_driver = {
    name: 'get_revenue_by_driver',
    description: 'Get revenue breakdown by driver. Use for "how much did each driver earn", "top earning drivers this month".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.revenueByDriver(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined);
        return json(data);
    },
};
const get_payment_status_summary = {
    name: 'get_payment_status_summary',
    description: 'Get summary of invoice payment statuses — how many are paid, pending, overdue. Use for "how many unpaid invoices do we have", "payment status overview".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.paymentStatus(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined);
        return json(data);
    },
};
const get_top_job_types = {
    name: 'get_top_job_types',
    description: 'Get top job types by volume or revenue. Use for "what are our most common job types", "top job types this quarter".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
            limit: { type: 'number', description: 'Number of results (default 10).' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.topJobTypes(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined, args.limit ? Number(args.limit) : undefined);
        return json(data);
    },
};
const get_monthly_revenue = {
    name: 'get_monthly_revenue',
    description: 'Get monthly revenue trend. Use for "show revenue by month", "monthly revenue for the last 6 months".',
    inputSchema: {
        type: 'object',
        properties: {
            months: { type: 'number', description: 'Number of months to look back (default 12).' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.monthlyRevenue(args.months ? Number(args.months) : undefined);
        return json(data);
    },
};
const get_update_expense = {
    name: 'update_expense',
    description: 'Update an existing expense. Use for "correct expense amount", "update expense category".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Expense ID.' },
            description: { type: 'string', description: 'Expense description.' },
            amount: { type: 'number', description: 'Amount in dollars.' },
            expenseDate: { type: 'string', description: 'Expense date (YYYY-MM-DD).' },
            categoryId: { type: 'string', description: 'Expense category ID.' },
            vendor: { type: 'string', description: 'Vendor/payee name.' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'CREDIT_CARD', 'OTHER'], description: 'Payment method.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'expenseDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const expense = await client.expenses.update(String(id), data);
        return `Expense updated successfully:\n${json(expense)}`;
    },
};
const login = {
    name: 'login',
    description: 'Authenticate with the 5Rivers API. Returns a token that must be passed to all other tools as the "token" parameter.',
    inputSchema: {
        type: 'object',
        properties: {
            email: { type: 'string', description: 'Your 5Rivers account email.' },
            password: { type: 'string', description: 'Your password.' },
            organizationSlug: { type: 'string', description: 'Your organization slug (e.g. "5rivers").' },
        },
        required: ['email', 'password', 'organizationSlug'],
    },
    handler: async (client, args) => {
        const result = await client.login(String(args.email), String(args.password), String(args.organizationSlug));
        return `Login successful. Use this token for all subsequent tool calls:\n\ntoken: ${result.token}\n\nUser: ${json(result.user)}`;
    },
};
// ── Export all tools ────────────────────────────────────────
export const ALL_TOOLS = [
    // Read
    list_jobs,
    get_job,
    search_jobs,
    get_dashboard_stats,
    list_invoices,
    get_invoice,
    list_drivers,
    list_companies,
    list_dispatchers,
    list_units,
    list_carriers,
    list_job_types,
    list_expenses,
    list_expense_categories,
    get_monthly_profit,
    get_expenses_by_category,
    get_monthly_revenue,
    get_revenue_by_company,
    get_revenue_by_driver,
    get_payment_status_summary,
    get_top_job_types,
    // Write / Update
    create_job,
    update_job,
    delete_job,
    create_job_type,
    create_driver,
    update_driver,
    create_company,
    update_company,
    create_dispatcher,
    update_dispatcher,
    create_unit,
    update_unit,
    create_carrier,
    update_carrier,
    create_expense,
    get_update_expense,
    create_expense_category,
    create_invoice,
    update_invoice,
    delete_invoice,
    // Invoice management
    get_next_invoice_number,
    get_invoice_jobs,
    add_job_to_invoice,
    remove_job_from_invoice,
    // Driver payments
    list_driver_payments,
    create_driver_payment,
    get_job_driver_pay,
    set_job_driver_pay,
    // Auth
    login,
];
