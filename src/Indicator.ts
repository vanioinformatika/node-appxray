export enum IndicatorStatus {
    UNKNOWN = "UNKNOWN",
    UP = "UP",
    DOWN = "DOWN",
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
