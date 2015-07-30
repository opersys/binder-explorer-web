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
    self._up2ProcessServices = {};

    self._cbOnServiceData = function (service) {
        self._onServiceData.apply(self, [service]);
    };

    self._cbOnProcessAdded = function (process) {
        self._onProcessAdded.apply(self, [process]);
    };

    self._cbOnProcessServiceAdded = function (processService) {
        self._onProcessServiceAdded.apply(self, [processService]);
    };

    self._cbOnProcessServiceRemoved = function (processService) {
        self._onProcessServiceRemoved.apply(self, [processService]);
    };

    self._cbOnProcessRemoved = function (processPid) {
        self._onProcessRemoved.apply(self, [processPid]);
    };

    binderWatcher.addListener("onServiceData", self._cbOnServiceData);
    binderWatcher.addListener("onProcessAdded", self._cbOnProcessAdded);
    binderWatcher.addListener("onProcessRemoved", self._cbOnProcessRemoved);
    binderWatcher.addListener("onProcessServiceAdded", self._cbOnProcessServiceAdded);
    binderWatcher.addListener("onProcessServiceRemoved", self._cbOnProcessServiceRemoved);
};

util.inherits(DataFeeder, events.EventEmitter);

DataFeeder.prototype.start = function () {
    var self = this;
    var binderServices = self._binderWatcher.getServices();
    var binderProcesses = self._binderWatcher.getProcesses();
    var userProcesses = self._binderWatcher.getUserProcesses();

    debug("Connection: data feeder started ["
       + _.values(binderServices).length + " services, " +
       + _.values(binderProcesses).length + " processes]");

    _.values(binderServices).forEach(function (binderService) {
        self._up2Services[binderService.name] = true;
        self._sock.emit("service", binderService);
    });

    _.values(binderProcesses).forEach(function (binderProcess) {
        self._up2Processes[binderProcesses.proc] = true;
        self._sock.emit("processadded", binderProcess);
    });

    _.values(userProcesses).forEach(function (userProcessService) {
        _.values(userProcessService.services).forEach(function (userService) {
            self._up2ProcessServices[userService.intent] = true;
            self._sock.emit("processserviceadded", userService);
        });
    });
};

DataFeeder.prototype.stop = function () {
    var self = this;

    debug("Disconnection, data feeder stopped");

    self._binderWatcher.removeListener("onServiceData", self._cbOnServiceData);
    self._binderWatcher.removeListener("onProcessAdded", self._cbOnProcessServiceAdded);
    self._binderWatcher.removeListener("onProcessRemoved", self._cbOnProcessRemoved);
    self._binderWatcher.removeListener("onProcessServiceAdded", self._cbOnProcessServiceAdded);
    self._binderWatcher.removeListener("onProcessServiceRemoved", self._cbOnProcessServiceRemoved);
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

    if (!self._up2Processes[binderProcess.pid]) {
        debug("Process " + binderProcess.pid + " was added");

        self._up2Processes[binderProcess.pid] = true;
        self._sock.emit("processadded", binderProcess);
    } else {
        debug("Not sending process addition for " + processPid + ": Already added.");
    }
};

DataFeeder.prototype._onProcessRemoved = function (processPid) {
    var self = this;

    if (self._up2Processes[processPid]) {
        debug("Process " + processPid + " is gone");

        delete self._up2Processes[processPid];
        self._sock.emit("processremoved", processPid);
    } else {
        debug("Not sending process removal for " + processPid + ": Already gone.");
    }
};

DataFeeder.prototype._onProcessServiceAdded = function (processService) {
    var self = this;

    if (!self._up2ProcessServices[processService.intent]) {
        debug("Process " + processService.pid + " service " + processService.intent + " STARTED");

        self._up2ProcessServices[processService.intent] = true;
        self._sock.emit("processserviceadded", processService);
    }
};

DataFeeder.prototype._onProcessServiceRemoved = function (processService) {
    var self = this;

    if (self._up2ProcessServices[processService.intent]) {
        debug("Process " + processService.pid+ " service " + processService.intent + " STOPPED");

        delete self._up2ProcessServices[processService.intent];
        self._sock.emit("processserviceremoved", processService);
    }
};

module.exports = DataFeeder;
