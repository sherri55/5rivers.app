/**
 * REST client for 5rivers.app backend API.
 * Replaces the old GraphQL client — used by both MCP tools and the agent.
 */
export interface RestClientConfig {
    baseUrl: string;
    authToken?: string;
}
export interface ListParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    filters?: Record<string, string>;
    search?: string;
}
export interface ListResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare function createRestClient(config: RestClientConfig): {
    jobs: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    jobTypes: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    drivers: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    companies: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    dispatchers: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    units: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    carriers: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    invoices: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    invoiceExtras: {
        nextNumber: () => Promise<{
            nextNumber: string;
        }>;
    };
    expenses: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    expenseCategories: {
        list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
        get: (id: string) => Promise<Record<string, unknown>>;
        create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
        delete: (id: string) => Promise<void>;
    };
    analytics: {
        dashboard: () => Promise<Record<string, unknown>>;
        dailyRevenue: (days?: number) => Promise<unknown[]>;
        monthlyRevenue: (months?: number) => Promise<unknown[]>;
        revenueByCompany: (startDate?: string, endDate?: string) => Promise<unknown[]>;
        revenueByDriver: (startDate?: string, endDate?: string) => Promise<unknown[]>;
        expensesByCategory: (startDate?: string, endDate?: string) => Promise<unknown[]>;
        monthlyExpenses: (months?: number) => Promise<unknown[]>;
        monthlyProfit: (months?: number) => Promise<unknown[]>;
        topJobTypes: (startDate?: string, endDate?: string, limit?: number) => Promise<unknown[]>;
        paymentStatus: (startDate?: string, endDate?: string) => Promise<unknown>;
    };
    withToken: (token: string) => {
        jobs: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        jobTypes: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        drivers: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        companies: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        dispatchers: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        units: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        carriers: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        invoices: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        invoiceExtras: {
            nextNumber: () => Promise<{
                nextNumber: string;
            }>;
        };
        expenses: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        expenseCategories: {
            list: (params?: ListParams) => Promise<ListResult<Record<string, unknown>>>;
            get: (id: string) => Promise<Record<string, unknown>>;
            create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
            delete: (id: string) => Promise<void>;
        };
        analytics: {
            dashboard: () => Promise<Record<string, unknown>>;
            dailyRevenue: (days?: number) => Promise<unknown[]>;
            monthlyRevenue: (months?: number) => Promise<unknown[]>;
            revenueByCompany: (startDate?: string, endDate?: string) => Promise<unknown[]>;
            revenueByDriver: (startDate?: string, endDate?: string) => Promise<unknown[]>;
            expensesByCategory: (startDate?: string, endDate?: string) => Promise<unknown[]>;
            monthlyExpenses: (months?: number) => Promise<unknown[]>;
            monthlyProfit: (months?: number) => Promise<unknown[]>;
            topJobTypes: (startDate?: string, endDate?: string, limit?: number) => Promise<unknown[]>;
            paymentStatus: (startDate?: string, endDate?: string) => Promise<unknown>;
        };
        withToken: /*elided*/ any;
        login: (email: string, password: string, organizationSlug: string) => Promise<{
            token: string;
            user: Record<string, unknown>;
        }>;
    };
    login: (email: string, password: string, organizationSlug: string) => Promise<{
        token: string;
        user: Record<string, unknown>;
    }>;
};
export type RestClient = ReturnType<typeof createRestClient>;
