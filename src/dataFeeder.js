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
var EventEmitter = require("events");

class DataFeeder extends EventEmitter {

    constructor(binderWatcher, sock) {
        super();
        this._binderWatcher = binderWatcher;
        this._sock = sock;
        this._up2Processes = {};
        this._up2Services = {};
        this._up2ProcessServices = {};

        this._binderWatcher.on("onServiceData", (binderService) => {
            this.onServiceData(binderService);
        });
        this._binderWatcher.on("onProcessAdded", (binderProcess) => {
            debug("onProcessAdded event from binderWatcher");
            this.onProcessAdded(binderProcess);
        });
        this._binderWatcher.on("onProcessRemoved", (processPid) => {
            this.onProcessRemoved(processPid);
        });
        this._binderWatcher.on("onProcessServiceAdded", (processService) => {
            this.onProcessServiceAdded(processService);
        });
        this._binderWatcher.on("onProcessServiceRemoved", (processService) => {
            this.onProcessServiceRemoved(processService);
        });
    }

    start() {
        var binderServices = this._binderWatcher.getServices();
        var binderProcesses = this._binderWatcher.getProcesses();
        var userProcesses = this._binderWatcher.getUserProcesses();

        debug("Data feeder started catching up ["
              + _.values(binderServices).length + " services, "
              + _.values(binderProcesses).length + " processes]");

        _.values(binderServices).forEach((binderService) => {
            this._up2Services[binderService.name] = true;
            this._sock.emit("service", binderService);
        });

        _.values(binderProcesses).forEach((binderProcess) => {
            this._up2Processes[binderProcess.pid] = true;
            this._sock.emit("processadded", binderProcess);
        });

        _.values(userProcesses).forEach((userProcessService) => {
            _.values(userProcessService.services).forEach((userService) => {
                this._up2ProcessServices[userService.intent] = true;
                this._sock.emit("processserviceadded", userService);
            });
        });

        debug("Data feeder is done catching up");
    }

    stop() {
        debug("Data feeder stopped");

        this._binderWatcher.off("onServiceData", this.onServiceData);
        this._binderWatcher.off("onProcessAdded", this.onProcessAdded);
        this._binderWatcher.off("onProcessRemoved", this.onProcessRemoved);
        this._binderWatcher.off("onProcessServiceAdded", this.onProcessServiceAdded);
        this._binderWatcher.off("onProcessServiceRemoved", this.onProcessServiceRemoved);
    }

    onServiceData(binderService) {
        debug("Service " + binderService.name + " was added");

        if (!this._up2Services[binderService.name]) {
            this._up2Services[binderService.name] = true;
            this._sock.emit("service", binderService);
        }
    }

    onProcessAdded(binderProcess) {
        if (!this._up2Processes[binderProcess.pid]) {
            debug("Process " + binderProcess.pid + " was added");

            this._up2Processes[binderProcess.pid] = true;
            this._sock.emit("processadded", binderProcess);
        }
        else debug("Not sending process addition for " + binderProcess.pid + ": Already added.");
    }

    onProcessRemoved(processPid) {
        if (this._up2Processes[processPid]) {
            debug("Process " + processPid + " is gone");

            delete this._up2Processes[processPid];
            this._sock.emit("processremoved", processPid);
        }
        else debug("Not sending process removal for " + processPid + ": Already gone.");
    }

    onProcessServiceAdded(processService) {
        if (!this._up2ProcessServices[processService.intent]) {
            debug("Process " + processService.pid + " service " + processService.intent + " STARTED");

            this._up2ProcessServices[processService.intent] = true;
            this._sock.emit("processserviceadded", processService);
        }
    }

    onProcessServiceRemoved(processService) {
        if (this._up2ProcessServices[processService.intent]) {
            debug("Process " + processService.pid+ " service " + processService.intent + " STOPPED");

            delete this._up2ProcessServices[processService.intent];
            this._sock.emit("processserviceremoved", processService);
        }
    }
}

module.exports = DataFeeder;
