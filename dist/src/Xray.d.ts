/// <reference types="node" />
/// <reference types="bluebird" />
import * as Promise from "bluebird";
import { EventEmitter } from "events";
import { Indicator, IndicatorOptions, IndicatorResponse, IndicatorStatus } from "./Indicator";
export declare class Xray {
    private running;
    private firstRun;
    private timeoutId;
    private defaultIndicatorTimeout;
    private interval;
    private eventEmitter;
    private indicators;
    setInterval(interval: number): this;
    setDefaultIndicatorTimeout(timeout: number): this;
    setEventEmitter(eventEmitter: EventEmitter): this;
    /**
     * Check if has named indicator or not
     *
     * @param {string} name
     *
     * @returns {boolean}
     */
    has(name: string): boolean;
    /**
     * Add new indicator
     *
     * @param {string} name
     * @param {Indicator} indicator
     * @param {IndicatorOptions} options
     *
     * @returns {Xray}
     */
    add(name: string, indicator: Indicator, options?: IndicatorOptions): this;
    /**
     * Try to remove existing indicator
     *
     * @param {string} name
     *
     * @returns {boolean}
     */
    remove(name: string): boolean;
    /**
     * Start continuous indicator check
     *
     * @return {void}
     */
    start(): void;
    /**
     * Get status from indicators
     *
     * If detailed options is true then it will return detailed information about indicators, otherwise it will return
     * single Status information. In the last case it will return UP if every indicator return with UP status
     *
     * {{detailed: boolean}} options
     *
     * @return {IndicatorStatus | Map<string, IndicatorResponse>}
     */
    status(): IndicatorStatus;
    status(name: string): IndicatorResponse;
    status({detailed}: {
        detailed: true;
    }): Map<string, IndicatorResponse>;
    /**
     * Call registered indicators
     *
     * @returns {Promise<Map<string, IndicatorResponse>>}
     */
    check(): Promise<Map<string, IndicatorResponse>>;
    /**
     * Recursive method to checking the indicators
     *
     * @return {void}
     */
    protected run(): void;
    /**
     * Call named indicator and store it's response
     *
     * @param {string} name
     *
     * @returns {Promise<IndicatorResponse>}
     */
    protected callIndicator(name: string): Promise<IndicatorResponse>;
    protected emit(event: string, ...args: any[]): void;
}
