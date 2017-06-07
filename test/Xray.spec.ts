import {TimeoutError} from "bluebird";
import {expect, use as chaiUse} from "chai";
import * as  chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinonChai from "sinon-chai";
import {IndicatorStatus} from "../src/Indicator";
import {Xray} from "../src/Xray";

chaiUse(sinonChai);
chaiUse(chaiAsPromised);
export const suite = (Xray: new () => Xray, source: string) => {
    describe("xray " + source, () => {
        describe("create / set xray", () => {
            it("should create new xray", () => {
                const xray = new Xray();

                expect(xray).to.instanceof(Xray);
            });

            it("should set interval", () => {
                const xray = new Xray();

                expect(xray.setInterval(10)).have.to.be.equal(xray);
            });

            it("should not set negative interval", () => {
                const xray = new Xray();

                expect(() => xray.setInterval(-10)).to.throw(Error);
            });

            it("should set default indicator timeout", () => {
                const xray = new Xray();

                expect(xray.setDefaultIndicatorTimeout(10)).have.to.be.equal(xray);
            });

            it("should not set negative default indicator timeout", () => {
                const xray = new Xray();

                expect(() => xray.setDefaultIndicatorTimeout(-10)).to.throw(Error);
            });
        });

        describe("adding / removing indicators", () => {
            const xray = new Xray();

            it("should return false for checking existence of non added indicator", () => {
                expect(xray.has("sample")).to.be.a("boolean").equal(false);
            });

            it("should add indicator", () => {
                expect(xray.add("sample", () => Promise.resolve())).to.be.equal(xray);
            });

            it("should return true for checking existence for added indicator", () => {
                expect(xray.has("sample")).to.be.a("boolean").equal(true);
            });

            it("should remove existing indicator", () => {
                expect(xray.remove("sample")).to.be.equal(true);
                expect(xray.has("sample")).to.be.a("boolean").equal(false);
            });

            it("should warn about removing not added indicator", () => {
                expect(xray.remove("sample")).to.be.equal(false);
            });
        });

        describe("check indicator", () => {
            it("should check indicator", () => {
                const xray = new Xray();

                xray.add("sample", () => {
                    return Promise.resolve("result");
                });

                // TODO rewrite with promise chai plugin
                return xray.check()
                    .then((result) => {
                        expect(result).have.to.be.instanceof(Map);
                        expect(Array.from(result.keys())).have.to.be.deep.equal(["sample"]);
                        expect(Array.from(result.values())).have.to.be.deep.equal(["result"]);
                    });
            });

            it("should check not working indicator", () => {
                const xray = new Xray();

                xray.add("sample", () => {
                    throw new Error("Something went wrong");
                });

                return expect(xray.check()).have.to.be.rejectedWith(Error, "Something went wrong");
            });

            it("should reach indicator timeout", () => {
                const xray = new Xray();

                xray.add("sample", () => {
                    return new Promise((resolve) => {
                        setTimeout(() => resolve(), 100);
                    });
                }, {timeout: 10});

                return expect(xray.check()).have.to.be.rejectedWith(TimeoutError, "operation timed out");
            });
        });

        describe("pool indicator", () => {
            it("should pool indicator", (done) => {
                const xray = new Xray();

                xray.setInterval(10);

                const startDate = Date.now();

                let count = 0;
                xray.add("sample", () => {
                    count++;
                    if (count === 2) {
                        expect(Date.now() - startDate).is.at.least(10).is.at.most(15);

                        done();
                    }

                    return Promise.resolve();
                });

                xray.start();
            });
        });

        describe("status information", () => {
            it("should result unknown status before pooling", () => {
                const xray = new Xray();

                xray.add("sample", () => Promise.resolve());

                expect(xray.status()).have.to.equal(IndicatorStatus.UNKNOWN);
            });

            it("should result up status before pooling without any indicator", () => {
                const xray = new Xray();

                expect(xray.status()).have.to.equal(IndicatorStatus.UP);
            });

            it("should result detailed status", (done) => {
                const xray = new Xray();

                xray.add("sample", () => {
                    return Promise.resolve("OK");
                });

                xray.start();

                setTimeout(() => {
                    const result = xray.status({detailed: true});

                    expect(result).have.to.be.instanceof(Map);
                    expect(Array.from(result.keys())).have.to.be.deep.equal(["sample"]);
                    expect(Array.from(result.values())).have.to.be.lengthOf(1);

                    done();
                }, 10);
            });

            it("should get status for single indicator", (done) => {
                const xray = new Xray();

                xray.add("sample", () => {
                    return Promise.resolve("OK");
                });

                xray.start();

                setTimeout(() => {
                    const result = xray.status("sample");

                    expect(result).have.to.be.an("object");
                    expect(result).have.to.has.property("status", IndicatorStatus.UP);
                    expect(result).have.to.has.property("lastCheck");
                    expect(result).have.to.has.property("response", "OK");

                    done();
                }, 10);
            });
        });

        describe("event emitting", () => {
            it("should emit started event", (done) => {
                const xray = new Xray();
                const EventEmitter = require("events");

                const events = new EventEmitter();

                events.on("xray.started", (status: IndicatorStatus) => {
                    expect(status).have.to.equal(IndicatorStatus.UP);

                    done();
                });

                xray.setEventEmitter(events);
                xray.start();
            });

            it("should not emit started event multiple time", (done) => {
                const xray = new Xray();
                const EventEmitter = require("events");

                const events = new EventEmitter();

                events.on("xray.started", () => {
                    done();
                });

                xray.setEventEmitter(events);
                xray.start();
            });

            it("should emit started event even with failed indicator", (done) => {
                const xray = new Xray();
                const EventEmitter = require("events");

                const events = new EventEmitter();

                events.on("xray.started", (status: IndicatorStatus) => {
                    expect(status).have.to.equal(IndicatorStatus.DOWN);

                    done();
                });

                xray.setEventEmitter(events);
                xray.add("sample", () => {
                    throw new Error("Something went wrong");
                });

                xray.start();
            });

            it("should emit indicator's success event", (done) => {
                const xray = new Xray();
                const EventEmitter = require("events");

                const events = new EventEmitter();

                events.on("xray.indicator.success", (name: string, status: IndicatorStatus) => {
                    expect(name).have.to.equal("sample");
                    expect(status).have.to.equal("OK");

                    done();
                });

                xray.add("sample", () => {
                    return Promise.resolve("OK");
                });

                xray.setEventEmitter(events);

                xray.check();
            });

            it("should emit indicator's failed event", (done) => {
                const xray = new Xray();
                const EventEmitter = require("events");

                const events = new EventEmitter();

                const error = new Error("Something went wrong");

                events.on("xray.indicator.error", (status: IndicatorStatus, name: string) => {
                    expect(status).have.to.equal(error);
                    expect(name).have.to.equal("sample");

                    done();
                });

                xray.add("sample", () => {
                    throw error;
                });

                xray.setEventEmitter(events);

                // Do nothing with error
                // noinspection TsLint
                xray.check().catch(() => {});
            });
        });
    });
};

suite(require("../src/Xray").Xray, "src");
suite(require("../dist/index").Xray, "dist");
