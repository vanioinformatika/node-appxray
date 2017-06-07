"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const IndicatorNotFoundError_1 = require("./error/IndicatorNotFoundError");
const Indicator_1 = require("./Indicator");
class Xray {
    constructor() {
        this.running = false;
        this.firstRun = true;
        this.defaultIndicatorTimeout = 1000;
        this.interval = 1000;
        this.indicators = new Map();
    }
    setInterval(interval) {
        if (interval <= 0) {
            throw new Error("'interval' parameter have to be larger than 0");
        }
        this.interval = interval;
        return this;
    }
    setDefaultIndicatorTimeout(timeout) {
        if (timeout < 0) {
            throw new Error("'timeout' parameter have to be larger than 0");
        }
        this.defaultIndicatorTimeout = timeout;
        return this;
    }
    setEventEmitter(eventEmitter) {
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
    has(name) {
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
    add(name, indicator, options) {
        options = options || {};
        this.indicators.set(name, {
            indicator,
            name,
            options,
            response: {
                lastCheck: null,
                status: Indicator_1.IndicatorStatus.UNKNOWN,
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
    remove(name) {
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
    start() {
        if (!this.running) {
            this.running = true;
            this.run();
        }
    }
    status(arg1) {
        arg1 = arg1 || {};
        // status(name: string): IndicatorResponse
        if (typeof arg1 === "string") {
            const indicator = this.indicators.get(arg1);
            if (!indicator) {
                throw new IndicatorNotFoundError_1.IndicatorNotFoundError(arg1);
            }
            return indicator.response;
        }
        // status(): IndicatorStatus
        // status({detailed}: { detailed: true }): Map<string, IndicatorResponse>
        if (arg1.detailed) {
            const result = new Map();
            this.indicators.forEach((value, name) => {
                result.set(name, value.response);
            });
            return result;
        }
        let result = Indicator_1.IndicatorStatus.UP;
        this.indicators.forEach(({ response }) => {
            if (response.status === Indicator_1.IndicatorStatus.UNKNOWN) {
                result = Indicator_1.IndicatorStatus.UNKNOWN;
            }
            else if (response.status === Indicator_1.IndicatorStatus.DOWN && result !== Indicator_1.IndicatorStatus.UNKNOWN) {
                result = Indicator_1.IndicatorStatus.DOWN;
            }
        });
        return result;
    }
    /**
     * Call registered indicators
     *
     * @returns {Promise<Map<string, IndicatorResponse>>}
     */
    check() {
        if (this.indicators.size === 0) {
            return Promise.resolve(new Map());
        }
        return Promise
            .all(Array.from(this.indicators.keys()).map((name) => {
            return Promise.all([name, this.callIndicator(name)]);
        }))
            .then((indicatorResponses) => {
            const result = new Map();
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
    run() {
        this.timeoutId = undefined;
        let promise = this.check()
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
    callIndicator(name) {
        const indicator = this.indicators.get(name);
        if (!indicator) {
            // This error should never throw, but for TS type safety need to place here
            throw new IndicatorNotFoundError_1.IndicatorNotFoundError(name);
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
                status: Indicator_1.IndicatorStatus.UP,
            };
            this.emit("xray.indicator.success", name, response);
            return response;
        })
            .catch((error) => {
            indicator.response = {
                error,
                lastCheck: Date.now(),
                status: Indicator_1.IndicatorStatus.DOWN,
            };
            this.emit("xray.indicator.error", error, name);
            throw error;
        });
        promise = promise.timeout(indicator.options.timeout || this.defaultIndicatorTimeout);
        return promise;
    }
    emit(event, ...args) {
        if (this.eventEmitter) {
            this.eventEmitter.emit(event, ...args);
        }
    }
}
exports.Xray = Xray;
//# sourceMappingURL=Xray.js.map