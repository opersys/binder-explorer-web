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

var _  = require("underscore");
var debug = require("debug")("be:feeder");
var events = require("events");
var util = require("util");

var DataFeeder = function (binderWatcher, sock) {
    var self = this;

    self._binderWatcher = binderWatcher;
    self._sock = sock;
    self._up2Processes = {};
    self._up2Services = {};

    binderWatcher.addListener("onServiceData", function (service) {
        self._onServiceData.apply(self, [service]);
    });

    binderWatcher.addListener("onProcessAdded", function (process) {
        self._onProcessAdded.apply(self, [process]);
    });

    binderWatcher.addListener("onProcessRemoved", function (processPid) {
        self._onProcessRemoved.apply(self, [processPid]);
    });
};

util.inherits(DataFeeder, events.EventEmitter);

DataFeeder.prototype.start = function () {
    var self = this;
    var binderServices = self._binderWatcher.getServices();
    var binderProcesses = self._binderWatcher.getProcesses();

    debug("Connection: data feeder started ["
       + _.values(binderServices).length + " services, " +
       + _.values(binderProcesses).length + " processes]");

    _.values(binderServices).forEach(function (binderService) {
        self._up2Services[binderService.name] = true;
        self._sock.emit("service", binderService);
    });

    _.values(binderProcesses).forEach(function (binderProcess) {
        self._up2Processes[binderProcesses.pid] = true;
        self._sock.emit("processadded", binderProcess);
    });
};

DataFeeder.prototype._onServiceData = function (binderService) {
    var self = this;

    debug("Service " + binderService.name + " was added");

    if (!self._up2Services[binderService.name]) {
        self._up2Services[binderService.name] = true;
        self._sock.emit("service", binderService);
    }
};

DataFeeder.prototype._onProcessAdded = function (binderProcess) {
    var self = this;

    debug("Process " + binderProcess.pid + " was added");

    if (!self._up2Processes[binderProcess.pid]) {
        self._up2Processes[binderProcess.pid] = true;
        self._sock.emit("processadded", binderProcess);
    }
};

DataFeeder.prototype._onProcessRemoved = function (processPid) {
    var self = this;

    debug("Process " + processPid + " is gone");

    if (self._up2Processes[processPid]) {
        delete self._up2Processes[processPid];
        self._sock.emit("processremoved", processPid);
    }
};

module.exports = DataFeeder;
