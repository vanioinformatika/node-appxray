export declare enum IndicatorStatus {
    UNKNOWN = 0,
    UP = 1,
    DOWN = 2,
}
export interface IndicatorResponse {
    status: IndicatorStatus;
    lastCheck: number | null;
    response?: any;
    error?: any;
}
export interface IndicatorOptions {
    timeout?: number;
}
export declare type Indicator = () => Promise<any>;
