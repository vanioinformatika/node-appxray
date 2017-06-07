export class IndicatorNotFoundError extends Error {
    public constructor(name: string) {
        super("Indicator not found with \"" + name + "\" name");
    }
}
