/*
 * Copyright (C) 2015 Opersys inc.
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

var async = require("async");
var util = require("util");
var events = require("events");
var fs = require("fs");
var Binder = require("jsbinder");
var _ = require("underscore");
var debug = require("debug")("be:watcher");
var cp = require("child_process");
var pslook = require("pslook");

// Local modules
var BinderUtils = require("./binderUtils.js");
var ServiceListParser = require("./ServiceListParser.js");

var BinderWatcher = function (workingDir) {
    this._workingDir = workingDir;

    this._serviceManager = new Binder.ServiceManager();
    this._serviceListParser = new ServiceListParser();

    this._binderServices = {};
    this._binderProcesses = {};
    this._userProcesses = {};

    this._serviceManager = new Binder.ServiceManager();

    try {
        this._activityService = this._serviceManager.getService("activity");
    } catch (e) {
        // No activity service? Then this code will never work.
        this._activityService = null;
    }
};

util.inherits(BinderWatcher, events.EventEmitter);

BinderWatcher.prototype.getProcesses = function () { return this._binderProcesses; };
BinderWatcher.prototype.getServices = function () { return this._binderServices; };
BinderWatcher.prototype.getUserProcesses = function () { return this._userProcesses; };

BinderWatcher.prototype.start = function() {
    var self = this;

    debug("Starting timers.");

    setTimeout(function () { self._scanBinderServices(); }, 500);
    setTimeout(function () { self._scanBinderProcesses(); }, 500);
    setTimeout(function () { self._scanProcessServices(); }, 1000);
};

BinderWatcher.prototype._scanProcessServices = function () {
    var self = this;
    var dumpOut;

    if (!this._activityService) return;

    dumpOut = self._activityService.dump("services");
    self._serviceListParser.parseOutput(dumpOut);

    _.map(_.values(self._binderProcesses), function (bproc) {
        var svcs = self._serviceListParser.getServicesForPid(bproc.pid);

        if (!self._userProcesses[bproc.pid]) {
            self._userProcesses[bproc.pid] = {
                services: [],
                pid: bproc.pid
            };
        }

        if (svcs) {
            svcs.forEach(function (svc) {
                if (!_.some(self._userProcesses[svc.pid].services, function (bsvc) {
                        return bsvc.intent === svc.intent;
                    })) {
                    self._userProcesses[svc.pid].services.push(svc);
                    self._userProcesses[svc.pid].pid = svc.pid;

                    self.emit("onProcessServiceAdded", svc);
                }
            });
        }

        if (svcs.length < self._userProcesses[bproc.pid].services.length) {
            self._userProcesses[bproc.pid].services = _.filter(self._userProcesses[bproc.pid].services,
                function (bsvc) {
                    if (_.some(svcs, function (s) {
                            return s.intent === bsvc.intent;
                        })) {
                        self.emit("onProcessServiceRemoved", bsvc);
                        return true;
                    }

                    return false;
                }
            );
        }
    });

    setTimeout(function () {
        self._scanProcessServices();
    }, 1000);
};

BinderWatcher.prototype._scanBinderServices = function () {
    var self = this, diff, newlist, oldlist;

    newlist = self._serviceManager.list();
    oldlist = _.keys(self._binderServices);

    diff = _.difference(newlist, oldlist);

    self._preloadBinderServiceData(
        function (binderProcs, binderProcsByNode) {

            async.eachLimit(diff, 10, function (added, callback) {
                self._readBinderServiceData(added, binderProcs, binderProcsByNode,
                    function (service) {
                        self.emit("onServiceData", service);
                        callback();
                    },
                    function (err) {
                        // TODO: Do something.
                        callback();
                    }
                );
            });
        }
    );
};

BinderWatcher.prototype._scanBinderProcesses = function () {
    var self = this;
    var newlist, oldlist, addedlist, removedlist;

    BinderUtils.readBinderStateFile(function (newBinderProcs) {
        oldlist = _.keys(self._binderProcesses);
        newlist = _.keys(newBinderProcs);

        addedlist = _.difference(newlist, oldlist);
        removedlist = _.difference(oldlist, newlist);

        if (addedlist.length > 0) {
            debug("Added list: " + util.inspect(addedlist));
        }
        if (removedlist.length > 0) {
            debug("Removed list: " + util.inspect(removedlist));
        }

        if (addedlist.length > 0 || removedlist.length > 0) {
            debug("Done scanning binder processes: " + addedlist.length + " added, " + removedlist.length + " removed");
        }

        async.parallel([

            function (parallelCallback) {
                async.each(addedlist,
                    function (added, eachCallback) {
                        debug("added: " + added);
                        self._readBinderProcessData(added,
                            function (process) {
                                self.emit("onProcessAdded", process);
                                eachCallback();
                            },
                            function (err) {
                                debug("Error reading Binder process data for " + added + ": " + err);
                                eachCallback();
                            }
                        );
                    },
                    function () {
                        debug("Done handling added process list.");
                        parallelCallback();
                    }
                );
            },

            function (parallelCallback) {
                async.each(removedlist,
                    function (removed, eachCallback) {
                        delete self._binderProcesses[removed];
                        self.emit("onProcessRemoved", removed);
                        eachCallback();
                    },
                    function () {
                        debug("Done handling removed process list.");
                        parallelCallback();
                    }
                );
            }

        ], function () {
            setTimeout(function () {
                self._scanBinderProcesses();
            }, 1000);
        });
    });
};

BinderWatcher.prototype._readBinderProcessData = function (binderProcId, successCallback, errorCallback) {
    var self = this;

    debug("Reading process data for: " + binderProcId);

    async.waterfall([
        function (next) {
            BinderUtils.readBinderStateFile(
                function (binderProcs) {
                    if (binderProcs[binderProcId]) {
                        self._binderProcesses[binderProcId] = binderProcs[binderProcId];
                        next();
                    } else {
                        next("Unknown binder process");
                    }
                },
                function (err) {
                    next(err);
                }
            );
        },

        function (next) {

            /*
             * PSLOOK 0.10 ERROR HANDLE IS PATHOLOGICAL. For each option put in fields, the error
             * callback risks be called many times.
             */

            pslook.read(binderProcId, function (err, procData) {
                if (err) {
                    next("Failed to read process data from /proc");
                } else {
                    self._binderProcesses[binderProcId].process = procData;
                    next();
                }
            }, {fields: pslook.CMD });
        }
    ],
        // Error handler.
        function (err) {
            if (err && errorCallback) {
                delete self._binderProcesses[binderProcId];
                errorCallback("Failed to get Binder process information: " + err);
            } else {
                successCallback(self._binderProcesses[binderProcId]);
            }
        }
    );
};

BinderWatcher.prototype._preloadBinderServiceData = function (preloadCallback) {
    BinderUtils.readBinderStateFile(
        // Success.
        function (binderProcs) {
            var binderProcsByNode = {};

            debug("Preloaded services data");

            _.each(_.keys(binderProcs), function (binderPid) {
                _.each(binderProcs[binderPid].nodes, function (nodeData) {
                    binderProcsByNode[nodeData.id] = {};
                    binderProcsByNode[nodeData.id] = binderProcs[binderPid];
                    binderProcsByNode[nodeData.id].node = nodeData.id;
                    binderProcsByNode[nodeData.id].pid = binderPid;
                });
            });

            preloadCallback(binderProcs, binderProcsByNode);
        }
    );
};

BinderWatcher.prototype._readBinderServiceData = function (serviceName, binderProcs, binderProcsByNode,
                                                           successCallback, errorCallback) {
    var self = this;

    try {
        async.waterfall([
            function (next) {
                BinderUtils.findServiceNodeId(self._workingDir, serviceName, function (node, iface) {
                    self._binderServices[serviceName] = {
                        name: serviceName,
                        iface: iface,
                        node: node,
                        pid: binderProcsByNode[node].pid
                    };

                    if (!serviceName) {
                        debug("No service name for interface " + iface);
                    }

                    //successCallback(self._binderServices[serviceName]);
                    next(null, binderProcsByNode[node].pid);
                });
            },

            function (pid, next) {
                pslook.read(pid, function (err, procData) {
                    if (err)
                        next("Failed to read process data");

                    self._binderServices[serviceName].process = procData;
                    next();
                }, {fields: pslook.PID | pslook.CWD | pslook.CMD | pslook.ENV });
            }
        ],

        function (err) {
            successCallback(self._binderServices[serviceName]);
        });
    } catch (err) {
        if (errorCallback) errorCallback(err);
    }
};

module.exports = BinderWatcher;