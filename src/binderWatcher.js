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

// Local modules
var BinderUtils = require("./binderUtils.js");

var BinderWatcher = function () {
    this._serviceManager = new Binder.ServiceManager();
    this._binderServices = {};
    this._binderProcesses = {};
};

util.inherits(BinderWatcher, events.EventEmitter);

BinderWatcher.prototype.getProcesses = function () { return this._binderProcesses; };
BinderWatcher.prototype.getServices = function () { return this._binderServices; };

BinderWatcher.prototype.start = function() {
    var self = this;

    debug("Starting timers.");

    setTimeout(function () { self._scanBinderServices(); }, 500);
    setTimeout(function () { self._scanBinderProcesses(); }, 500);
};

BinderWatcher.prototype._scanBinderServices = function () {
    var self = this, diff, newlist, oldlist;

    newlist = self._serviceManager.list();
    oldlist = _.keys(self._binderService);

    diff = _.difference(newlist, oldlist);

    async.each(diff, function (added, callback) {
        self._readBinderServiceData(added,
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
};

BinderWatcher.prototype._scanBinderProcesses = function () {
    var self = this;
    var newlist, oldlist, addedlist, removedlist;

    BinderUtils.readBinderStateFile(function (newBinderProcs) {
        oldlist = _.keys(self._binderProcesses);
        newlist = _.keys(newBinderProcs);

        addedlist = _.difference(newlist, oldlist);
        removedlist = _.difference(oldlist, newlist);

        if (addedlist.length > 0 || removedlist.length > 0) {
            debug("Scanning binder processes: " + addedlist.length + " added, " + removedlist.length + " removed");
        }

        async.parallel([

            function (parallelCallback) {
                async.each(addedlist,
                    function (added, eachCallback) {
                        self._readBinderProcessData(added,
                            function (process) {
                                self.emit("onProcessAdded", process);
                                eachCallback();
                            },
                            function () {
                                eachCallback();
                            });
                    },
                    function () {
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

    BinderUtils.readBinderStateFile(
        function (binderProcs) {
            if (binderProcs[binderProcId]) {
                self._binderProcesses[binderProcId] = binderProcs[binderProcId];
                successCallback(self._binderProcesses[binderProcId]);
            }
        },
        function (err) {
            if (errorCallback) errorCallback(err);
        }
    );
};

BinderWatcher.prototype._readBinderServiceData = function (serviceName, successCallback, errorCallback) {
    var self = this;

    debug("Reading service data for: " + serviceName);

    try {
        // Make a catalog of node IDs to PID because findServiceNodeId doesn't provide
        // us with the PID.
        BinderUtils.readBinderStateFile(
            function (binderProcs) {
                var binderProcsByNode = {};

                _.each(_.keys(binderProcs), function (binderPid) {
                    _.each(binderProcs[binderPid].nodes, function (nodeData) {
                        binderProcsByNode[nodeData.id] = {};
                        binderProcsByNode[nodeData.id] = binderProcs[binderPid];
                        binderProcsByNode[nodeData.id].node = nodeData.id;
                        binderProcsByNode[nodeData.id].pid = binderPid;
                    });
                });

                BinderUtils.findServiceNodeId(serviceName, function (node, iface) {
                    self._binderServices[serviceName] = {
                        name: serviceName,
                        iface: iface,
                        node: node,
                        pid: binderProcsByNode[node].pid
                    };

                    if (!serviceName) {
                        debug("No service name for interface " + iface);
                    }

                    successCallback(self._binderServices[serviceName]);
                });
            },
            function (err) {
                if (errorCallback) errorCallback(err);
            }
        );
    } catch (err) {
        if (errorCallback) errorCallback(err);
    }
};

module.exports = BinderWatcher;