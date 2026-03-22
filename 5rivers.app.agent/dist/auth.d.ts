export declare function loadAuthMap(): void;
export declare function getToken(platform: string, userId: string): string | undefined;
export declare function setToken(platform: string, userId: string, token: string): void;
export declare function removeToken(platform: string, userId: string): void;
export declare function hasToken(platform: string, userId: string): boolean;
