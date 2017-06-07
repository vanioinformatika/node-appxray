"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class IndicatorNotFoundError extends Error {
    constructor(name) {
        super("Indicator not found with \"" + name + "\" name");
    }
}
exports.IndicatorNotFoundError = IndicatorNotFoundError;
//# sourceMappingURL=IndicatorNotFoundError.js.map