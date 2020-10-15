/*
 * Copyright (C) 2015-2018 Opersys inc.
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

const async = require("async");
const util = require("util");
const events = require("events");
const fs = require("fs");
const debug = require("debug")("be:watcher");
const cp = require("child_process");
const pslook = require("pslook");
const rl = require("readline");
const EventEmitter = require("events");
const Buffer = require("buffer").Buffer;

// Local modules
const BinderUtils = require("./binderUtils.js");
const ServiceListParser = require("./ServiceListParser.js");
const ServiceManager = require("./ServiceManager.js");

class BinderWatcher extends EventEmitter {
    constructor() {
        super();

        this._serviceListParser = new ServiceListParser();
        this._binderServices = {};
        this._binderProcesses = {};
        this._userProcesses = {};
        this._serviceManager = new ServiceManager.ServiceManager();
    }

    getProcesses() { return this._binderProcesses; }
    getServices() { return this._binderServices; }
    getUserProcesses() { return this._userProcesses; }

    start() {
        debug("Starting timers.");

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
        var dumpOut;

        // If the activty service isn't there, this won't work at all.
        if (!this._serviceManager.getService("activity"))
            return;

        this.dumpServices(() => {
            Object.values(this._binderProcesses).map((bproc) => {
                var svcs = this._serviceListParser.getServicesForPid(bproc.pid);

                if (!this._userProcesses[bproc.pid]) {
                    this._userProcesses[bproc.pid] = {
                        services: [],
                        pid: bproc.pid
                    };
                }

                if (svcs) {
                    svcs.forEach((svc) => {
                        if (!this._userProcesses[svc.pid].services.some((bsvc) => bsvc.intent === svc.intent)) {
                            this._userProcesses[svc.pid].services.push(svc);
                            this._userProcesses[svc.pid].pid = svc.pid;                        
                            this.emit("onProcessServiceAdded", svc);
                        }
                    });
                }

                if (svcs.length < this._userProcesses[bproc.pid].services.length) {
                    this._userProcesses[bproc.pid].services = this._userProcesses[bproc.pid].services.filter(
                        (bsvc) => {
                            if (svcs.some((s) => s.intent === bsvc.intent))
                                this.emit("onProcessServiceRemoved", bsvc);
                        });
                }
            });

            setTimeout(() => { this.scanProcessServices(); }, 1000);            
        }, () => {
            debug("Cannot get user processes");
        });        
    }

    scanBinderServices() {
        let diff, newlist, oldlist;

        newlist = this._serviceManager.all().map((service) => service.name);
        oldlist = Object.keys(this._binderServices);

        diff = newlist.filter(x => !oldlist.includes(x));

        this.preloadBinderServiceData((binderProcs, binderProcsByNode) => {
            async.eachLimit(diff, 10, (added, callback) => {
                
                debug("Looking for service: " + added);
                
                this.readBinderServiceData(added, binderProcs, binderProcsByNode,
                                           (service) => {
                                               this.emit("onServiceData", service);
                                               callback();
                                           }, (err) => {
                                               console.log("readBinderServiceData failed");
                                               // TODO: Do something.
                                               callback();
                                           });
            });
        });
    }

    scanBinderProcesses() {
        let newlist, oldlist, addedlist, removedlist;
        
        BinderUtils.readBinderStateFile((newBinderProcs) => {
            oldlist = Object.keys(this._binderProcesses);
            newlist = Object.keys(newBinderProcs);

            addedlist = newlist.filter(x => !oldlist.includes(x));
            removedlist = oldlist.filter(x => !newlist.includes(x));

            if (addedlist.length > 0)
                debug("Added list: " + util.inspect(addedlist));

            if (removedlist.length > 0)
                debug("Removed list: " + util.inspect(removedlist));

            if (addedlist.length > 0 || removedlist.length > 0)
                debug("Done scanning binder processes: " + addedlist.length + " added, " + removedlist.length + " removed");
            async.each(addedlist, (added, eachCallback) => {
                this.readBinderProcessData(added, (process) => {
                    this.emit("onProcessAdded", process);
                    eachCallback();
                }, (err) => {
                    debug("Error reading Binder process data for " + added + ": " + err);
                    eachCallback();
                });
            });

            removedlist.forEach((removed) => {
                delete this._binderProcesses[removed];
                this.emit("onProcessRemoved", removed);                            
            });
            
            setTimeout(() => { this.scanBinderProcesses(); }, 1000);
        });
    };

    readBinderProcessData(binderProcId, successCallback, errorCallback) {
        let binderProcess = {};
        
        async.waterfall([(next) => {
            BinderUtils.readBinderStateFile((binderProcs) => {
                if (binderProcs[binderProcId]) {
                    binderProcess = binderProcs[binderProcId];
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
                    if (!procData.cmdline[0].endsWith("grabservice")) {
                        binderProcess.process = procData;
                        next();
                    }
                    else next("grabservice");
                }
            }, {fields: pslook.CMD });            
        }, (next) => {
            // Properly add the process to the list.
            this._binderProcesses[binderProcId] = binderProcess;
            next();
        }],(err) => {
            if (err && errorCallback) {
                // Grabservice processes needs to be excluded.
                if (err != "grabservice") {
                    delete this._binderProcesses[binderProcId];
                    errorCallback("Failed to get Binder process information: " + err);
                }
            }
            else successCallback(this._binderProcesses[binderProcId]);
        });
    }

    preloadBinderServiceData(preloadCallback) {
        BinderUtils.readBinderStateFile((binderProcs) => {
            var binderProcsByNode = {};

            debug("Preloaded services data");

            Object.keys(binderProcs).forEach((binderPid) => {
                binderProcs[binderPid].nodes.forEach((nodeData) => {
                    binderProcsByNode[nodeData.id] = {};
                    binderProcsByNode[nodeData.id] = binderProcs[binderPid];
                    binderProcsByNode[nodeData.id].node = nodeData.id;
                    binderProcsByNode[nodeData.id].pid = binderPid;
                });
            });

            preloadCallback(binderProcs, binderProcsByNode);
        });
    }

    readBinderServiceData(serviceName, binderProces, binderProcsByNode, successCallback, errorCallback) {
        try {
            async.waterfall([(next) => {
                BinderUtils.findServiceNodeId(serviceName, (node, iface) => {
                    if (binderProcsByNode[node] == null)
                        next(null, null);
                    else {
                        this._binderServices[serviceName] = {
                            name: serviceName,
                            iface: iface,
                            node: node,
                            pid: binderProcsByNode[node].pid
                        };

                        if (!serviceName)
                            debug("No service name for interface " + iface);

                        //successCallback(self._binderServices[serviceName]);
                        next(null, binderProcsByNode[node].pid);
                    }
                });
            }, (pid, next) => {
                if (pid) {
                    pslook.read(pid, (err, procData) => {
                        if (err)
                            next("Failed to read process data");

                        this._binderServices[serviceName].process = procData;
                        next();
                    }, {fields: pslook.PID | pslook.CWD | pslook.CMD | pslook.ENV });
                }
            }
        ], (err) => {
            successCallback(this._binderServices[serviceName]);
        });
        } catch (err) {
            if (errorCallback) errorCallback(err);
        }        
    }
}

module.exports = BinderWatcher;
