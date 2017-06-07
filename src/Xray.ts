import * as Promise from "bluebird";
import {EventEmitter} from "events";
import {IndicatorNotFoundError} from "./error/IndicatorNotFoundError";
import {Indicator, IndicatorOptions, IndicatorResponse, IndicatorStatus} from "./Indicator";

interface IndicatorStructure {
    name: string;
    indicator: Indicator;
    options: IndicatorOptions;
    response: IndicatorResponse;
}

export class Xray {
    private running: boolean = false;

    private firstRun: boolean = true;

    private timeoutId: NodeJS.Timer | undefined;

    private defaultIndicatorTimeout: number = 1000;

    private interval: number = 1000;

    private eventEmitter: EventEmitter;

    private indicators: Map<string, IndicatorStructure> = new Map();

    public setInterval(interval: number): this {
        if (interval <= 0) {
            throw new Error("'interval' parameter have to be larger than 0");
        }

        this.interval = interval;

        return this;
    }

    public setDefaultIndicatorTimeout(timeout: number): this {
        if (timeout < 0) {
            throw new Error("'timeout' parameter have to be larger than 0");
        }

        this.defaultIndicatorTimeout = timeout;

        return this;
    }

    public setEventEmitter(eventEmitter: EventEmitter): this {
        this.eventEmitter = eventEmitter;

        return this;
    }

    /**
     * Check if has named indicator or not
     *
     * @param {string} name
     *
     * @returns {boolean}
     */
    public has(name: string): boolean {
        return this.indicators.has(name);
    }

    /**
     * Add new indicator
     *
     * @param {string} name
     * @param {Indicator} indicator
     * @param {IndicatorOptions} options
     *
     * @returns {Xray}
     */
    public add(name: string, indicator: Indicator, options?: IndicatorOptions): this {
        options = options || {};

        this.indicators.set(name, {
            indicator,
            name,
            options,
            response: {
                lastCheck: null,
                status: IndicatorStatus.UNKNOWN,
            },
        });

        return this;
    }

    /**
     * Try to remove existing indicator
     *
     * @param {string} name
     *
     * @returns {boolean}
     */
    public remove(name: string): boolean {
        if (this.has(name)) {
            this.indicators.delete(name);

            return true;
        }

        return false;
    }

    /**
     * Start continuous indicator check
     *
     * @return {void}
     */
    public start(): void {
        if (!this.running) {
            this.running = true;

            this.run();
        }
    }

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
    public status(): IndicatorStatus;
    public status(name: string): IndicatorResponse;
    public status({detailed}: { detailed: true }): Map<string, IndicatorResponse>;
    public status(arg1?: { detailed?: boolean } | string): any {
        arg1 = arg1 || {};

        // status(name: string): IndicatorResponse
        if (typeof arg1 === "string") {
            const indicator = this.indicators.get(arg1);

            if (!indicator) {
                throw new IndicatorNotFoundError(arg1);
            }

            return indicator.response;
        }

        // status(): IndicatorStatus
        // status({detailed}: { detailed: true }): Map<string, IndicatorResponse>
        if (arg1.detailed) {
            const result = new Map<string, IndicatorResponse>();

            this.indicators.forEach((value, name) => {
                result.set(name, value.response);
            });

            return result;
        }

        let result = IndicatorStatus.UP;

        this.indicators.forEach(({response}) => {
            if (response.status === IndicatorStatus.UNKNOWN) {
                result = IndicatorStatus.UNKNOWN;
            } else if (response.status === IndicatorStatus.DOWN && result !== IndicatorStatus.UNKNOWN) {
                result = IndicatorStatus.DOWN;
            }
        });

        return result;
    }

    /**
     * Call registered indicators
     *
     * @returns {Promise<Map<string, IndicatorResponse>>}
     */
    public check(): Promise<Map<string, IndicatorResponse>> {
        if (this.indicators.size === 0) {
            return Promise.resolve(new Map());
        }

        return Promise
            .all(Array.from(this.indicators.keys()).map((name) => {
                return Promise.all([name, this.callIndicator(name)]);
            }))
            .then((indicatorResponses) => {
                const result = new Map<string, IndicatorResponse>();

                indicatorResponses.forEach(([name, indicatorResponse]) => {
                    result.set(name, indicatorResponse);
                });

                return result;
            });
    }

    /**
     * Recursive method to checking the indicators
     *
     * @return {void}
     */
    protected run(): void {
        this.timeoutId = undefined;

        let promise: Promise<any> = this.check()
            .catch(() => {
                // TODO should we log the error???
            });

        if (this.firstRun) {
            this.firstRun = false;
            promise = promise.then(() => {
                // We can safely call status method, because
                this.emit("xray.started", this.status());
            });
        }

        promise.then(() => {
            if (this.running) {
                // Need to bind run method to its context to avoid overwriting methods context
                this.timeoutId = setTimeout(this.run.bind(this), this.interval);
            }
        });
    }

    /**
     * Call named indicator and store it's response
     *
     * @param {string} name
     *
     * @returns {Promise<IndicatorResponse>}
     */
    protected callIndicator(name: string): Promise<IndicatorResponse> {
        const indicator = this.indicators.get(name);

        if (!indicator) {
            // This error should never throw, but for TS type safety need to place here
            throw new IndicatorNotFoundError(name);
        }

        // We wrap indicator's promise into new one to protect indicator's promise context
        // For example: We set timeout to new promise not for indicator's promise
        let promise = Promise.resolve()
            .then(() => {
                return indicator.indicator();
            })
            .then((response) => {
                indicator.response = {
                    lastCheck: Date.now(),
                    response,
                    status: IndicatorStatus.DOWN,
                };

                this.emit("xray.indicator.success", name, response);

                return response;
            })
            .catch((error) => {
                indicator.response = {
                    error,
                    lastCheck: Date.now(),
                    status: IndicatorStatus.DOWN,
                };

                this.emit("xray.indicator.error", error, name);

                throw error;
            });

        promise = promise.timeout(indicator.options.timeout || this.defaultIndicatorTimeout);

        return promise;
    }

    protected emit(event: string, ...args: any[]): void {
        if (this.eventEmitter) {
            this.eventEmitter.emit(event, ...args);
        }
    }
}
