/** Returns a valid token, logging in automatically if credentials are configured. */
export declare function getAutoToken(): Promise<string | null>;
/** Clears the cached token so the next call to getAutoToken() re-authenticates. */
export declare function clearAutoToken(): void;
export declare function loadAuthMap(): void;
export declare function getToken(platform: string, userId: string): string | undefined;
export declare function setToken(platform: string, userId: string, token: string): void;
export declare function removeToken(platform: string, userId: string): void;
export declare function hasToken(platform: string, userId: string): boolean;
