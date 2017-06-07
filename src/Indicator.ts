export enum IndicatorStatus {
    UNKNOWN,
    UP,
    DOWN,
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

export type Indicator = () => Promise<any>;
