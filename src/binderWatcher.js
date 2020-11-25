/*
 * Copyright (C) 2015-2020 Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const assert = require("assert");
const async = require("async");
const util = require("util");
const events = require("events");
const fs = require("fs");
const cp = require("child_process");
const pslook = require("pslook");
const rl = require("readline");
const EventEmitter = require("events");
const Buffer = require("buffer").Buffer;

const debugProcService = require("debug")("be:watcher:procservice");
const debugService = require("debug")("be:watcher:service");
const debugProcess = require("debug")("be:watcher:process");

// Local modules
const BinderUtils = require("./binderUtils.js");
const ServiceListParser = require("./ServiceListParser.js");
const ServiceManager = require("./ServiceManager.js");
const FE = require("./FrontendObjects.js");

class BinderWatcher extends EventEmitter {
    constructor() {
        super();

        this._serviceListParser = new ServiceListParser();

        this._services = new Map();
        this._services.set("binder", new Map());
        this._services.set("hwbinder", new Map());
        this._services.set("vndbinder", new Map());

        this._processes = new Map();
        this._procServices = new Map();

        this._serviceManagers = new Map();
        this._serviceManagers.set("binder", new ServiceManager.ServiceManager());
        this._serviceManagers.set("hwbinder", new ServiceManager.HwServiceManager());
        this._serviceManagers.set("vndbinder", new ServiceManager.VndServiceManager());
    }

    getProcesses() { return this._processes; }
    getServices(binderName) { return this._services.get(binderName); }
    getProcessWithServices() { return this._procServices; }

    start() {
        setTimeout(() => { this.scanBinderServices(); }, 500);
        setTimeout(() => { this.scanBinderProcesses(); }, 500);
        setTimeout(() => { this.scanProcessServices(); }, 1000);
    }

    dumpServices(resultCb, errorCb) {
        let proc, buf;

        proc = cp.spawn("dumpsys", ["activity", "services"], {stdio: ["ignore", "pipe", "ignore"]});

        if (proc.stdout) {
            proc.stdout.on("data", (data) => {
                if (!buf)
                    buf = Buffer.from(data);
                else
                    buf = Buffer.concat([buf, data]);
            });

            proc.stdout.on("end", () => {
                this._serviceListParser.parseOutput(buf.toString());
                resultCb();
            });
        }
        else errorCb();
    }

    scanProcessServices() {
        // If the activty service isn't there, this won't work at all. So reschedule this at a later time.
        let serviceList = this._serviceManagers.get("binder").fetch();

        if (!serviceList.hasService("activity")) {
            debugProcService("No activity service, rescheduling");
            setTimeout(() => { this.scanProcessServices(); }, 1000);
            return;
        }

        this.dumpServices(() => {
            for (let proc of this._processes.values()) {
                let procServices = this._serviceListParser.getServicesForPid(proc.pid);

                if (!this._procServices.has(proc.pid)) {
                    this._procServices.set(proc.pid, {
                        services: [],
                        pid: proc.pid
                    });
                }

                for (let procService of procServices) {
                    let procServices;

                    procServices = this._procServices.get(procService.pid).services;

                    if (!procServices.some((aProcService) => aProcService.intent === procService.intent)) {
                        debugProcService(`Process service added ${procService.intent}, pid ${procService.pid}`);

                        procServices.push(procService);
                        this._procServices.get(procService.pid).pid = procService.pid;
                        this.emit("onProcessServiceAdded", FE.ProcessService.fromClass(procService));
                    }
                }

                if (procServices.length < this._procServices.get(proc.pid).services.length) {
                    let procServices;

                    procServices = this._procServices.get(proc.pid).services;
                    procServices = procServices.filter(
                        (bsvc) => {
                            if (procServices.some((s) => s.intent === bsvc.intent)) {
                                debugProcService(`Process service added ${bsvc.intent}, pid ${bsvc.pid}`);
                                this.emit("onProcessServiceRemoved", bsvc);
                            }
                        }
                    );
                }
            }

            setTimeout(() => { this.scanProcessServices(); }, 1000);
        }, () => {
            debugProcService("Cannot get process services");
        });
    }

    /**
     * Collect data about each services of each binders instances.
     */
    scanBinderServices() {
        // Iterate through each service managers
        for (let binderName of this._serviceManagers.keys()) {
            this._serviceManagers.get(binderName).fetch((serviceList) => {
                let newlist, oldlist, diff;

                // Check if anything has been added to the list of services.
                newlist = serviceList.all().map((service) => service.name);
                oldlist = Array.from(this._services.keys());

                diff = newlist.filter(x => !oldlist.includes(x));

                BinderUtils.readBinderStateFile((binderData) => {
                    // Check the data of each services that was added.
                    async.eachLimit(diff, 10, (added, callback) => {

                        debugService(`Looking up ${binderName}->${added}`);

                        // Callbacks isolated for readability in 80
                        // columns. Do not see anything else about me
                        // doing that.

                        let errCb = (err) => {
                            debugService(`Cannot read data for ${binderName}->${added}: ${err}`);
                            // TODO: Do something.
                            callback();
                        };

                        let okCb = (service) => {
                            assert(service);

                            this.emit("onServiceData", binderName, service);
                            callback();
                        };

                        this.readBinderServiceData(binderName, added, binderData, okCb, errCb);
                    });
                });
            });
        }
    }

    scanBinderProcesses() {
        let newlist, oldlist, addedlist, removedlist;

        BinderUtils.readBinderStateFile((binderData) => {
            oldlist = Array.from(this._processes.keys());
            newlist = Array.from(binderData.pids);

            addedlist = newlist.filter(x => !oldlist.includes(x));
            removedlist = oldlist.filter(x => !newlist.includes(x));

            if (debugProcess.enabled && addedlist.length > 0)
                debugProcess(`Added list: ${util.inspect(addedlist)}`);

            if (debugProcess.enabled && removedlist.length > 0)
                debugProcess(`Removed list: ${util.inspect(removedlist)}`);

            if (debugProcess.enabled && (addedlist.length > 0 || removedlist.length > 0))
                debugProcess(`Done scanning binder processes: ${addedlist.length} added, ${removedlist.length} removed`);

            async.each(addedlist, (added, eachCallback) => {
                this.readBinderProcessData(added, (process) => {
                    this.emit("onProcessAdded", process);
                    eachCallback();
                }, (err) => {
                    debugProcess(`Error reading Binder process data for ${added}: ${err}`);
                    eachCallback();
                });
            });

            // Remove the processes that are no longer in the list of
            // binder processes.
            for (let removed of removedlist) {
                this._processes.delete(removed);
                this.emit("onProcessRemoved", removed);
            }

            // Reschedule the scanning.
            setTimeout(() => { this.scanBinderProcesses(); }, 1000);
        });
    };

    readBinderProcessData(binderProcId, successCallback, errorCallback) {
        let proc;

        async.waterfall([(next) => {
            BinderUtils.readBinderStateFile((binderData) => {
                if (binderData.hasProcess(binderProcId)) {
                    proc = new FE.Process(binderProcId);

                    ["binder", "hwbinder", "vndbinder"].forEach((binderName) => {
                        if (binderData.getProcess(binderProcId).hasContext(binderName)) {
                            let procCtx = binderData.getProcess(binderProcId).getContext(binderName);

                            for (let ref of procCtx.refs)
                                proc.addRef(ref.node);
                        }
                    });

                    next();
                }
                else next("Unknown binder process");
            });
        }, (next) => {
            /*
             * PSLOOK 0.10 ERROR HANDLING IS PATHOLOGICAL. For each
             * option put in fields, the error callback risks be
             * called many times.
             */
            pslook.read(binderProcId, (err, procData) => {
                if (err)
                    next("Failed to read process data from /proc: " + err);
                else {
                    /* HACK: Discard 'grabservice' processes. */
                    if (procData.cmdline[0].indexOf("grabservice") == -1) {
                        proc.process = procData;
                        next();
                    }
                    else next("grabservice");
                }
            }, {fields: pslook.CMD });
        }, (next) => {
            // Properly add the process to the list.
            debugProcess(`Process ${proc.pid} was added to the process list`);
            this._processes.set(binderProcId, proc);
            next();
        }],(err) => {
            if (err && errorCallback) {
                // Grabservice processes needs to be excluded.
                if (err != "grabservice") {
                    this._processes.delete(binderProcId);
                    errorCallback("Failed to get process information: " + err);
                }
            }
            else successCallback(this._processes.get(binderProcId));
        });
    }

    readBinderServiceData(binderName, serviceName, binderData, successCallback, errorCallback) {
        try {
            async.waterfall([(next) => {
                BinderUtils.findServiceNodeId(this._serviceManagers.get(binderName), serviceName, (node) => {
                    if (!node)
                        next(`No NODE ID for service ${binderName}->${serviceName}`);

                    else if (!binderData.hasProcessByNode(node))
                        next(`Service ${binderName}->${serviceName} has no process for node ID ${node}`);

                    // Found a node ID.
                    else {
                        debugService(`Service ${binderName}->${serviceName} node ID: ${node}`);

                        let dataProc = binderData.getProcessByNode(node);
                        let service = new FE.Service(serviceName, node, dataProc.pid);

                        this._services.get(binderName).set(serviceName, service);

                        //successCallback(self._binderServices[serviceName]);
                        next(null, service.pid);
                    }
                });
            }, (pid, next) => {
                if (pid) {
                    pslook.read(pid, (err, procData) => {
                        if (err)
                            next("Failed to read process data");

                        this._services.get(binderName).get(serviceName).process = procData;
                        next();
                    }, {fields: pslook.PID | pslook.CWD | pslook.CMD | pslook.ENV });
                } else
                    next("No PID returned for service");
            }], (err) => {
                if (err)
                    errorCallback(err);
                else
                    successCallback(this._services.get(binderName).get(serviceName));
            });
        } catch (err) {
            if (errorCallback) errorCallback(err);
        }
    }
}

module.exports = BinderWatcher;
