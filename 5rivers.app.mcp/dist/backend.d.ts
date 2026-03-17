export interface BackendConfig {
    graphqlEndpoint: string;
    authToken?: string;
}
export declare function createBackendClient(config: BackendConfig): {
    getJobs(filters: {
        dateFrom?: string;
        dateTo?: string;
        driverId?: string;
        dispatcherId?: string;
        invoiceStatus?: string;
    }, pagination: {
        page?: number;
        limit?: number;
    }): Promise<{
        nodes: unknown[];
        totalCount: number;
        hasNextPage?: boolean;
        hasPreviousPage?: boolean;
    }>;
    getJob(id: string): Promise<unknown>;
    searchJobs(query: string, limit?: number): Promise<unknown[]>;
    getDashboardStats(year?: number, month?: number): Promise<unknown>;
    getInvoices(dispatcherId?: string, status?: string, limit?: number): Promise<unknown[]>;
};
