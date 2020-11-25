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

const debug = require("debug")("be:feeder");
const EventEmitter = require("events");
const util = require("util");

const FE = require("./FrontendObjects.js");

class DataFeeder extends EventEmitter {

    constructor(binderWatcher, sock) {
        super();
        this._binderWatcher = binderWatcher;
        this._sock = sock;
        this._up2Processes = new Set();
        this._up2Services = new Map();
        this._up2ProcessServices = new Set();

        this._up2Services.set("binder", new Set());
        this._up2Services.set("vndbinder", new Set());
        this._up2Services.set("hwbinder", new Set());

        this._binderWatcher.on("onServiceData", (binderName, binderService) => {
            this.onServiceData(binderName, binderService);
        });
        this._binderWatcher.on("onProcessAdded", (binderProcess) => {
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
        let services = new Map();
        let processes = this._binderWatcher.getProcesses();
        let procsWithServices = this._binderWatcher.getProcessWithServices();

        /* Please not that Socket.IO does not like Javascript Maps */

        services.set("vndbinder", this._binderWatcher.getServices("vndbinder"));
        services.set("hwbinder", this._binderWatcher.getServices("hwbinder"));
        services.set("binder", this._binderWatcher.getServices("binder"));

        debug("Data feeder started catching up ["
              + services.get("binder").size + " binder services, "
              + services.get("hwbinder").size + " hwbinder services, "
              + services.get("vndbinder").size + " vndbinder services, "
              + processes.size + " processes, "
              + procsWithServices.size + " processe services]");

        for (let binderName of services.keys()) {
            for (let service of services.get(binderName).values()) {
                this._up2Services.get(binderName).add(service.name);
                this._sock.emit("service", binderName, service);
            }
        }

        for (let process of processes.values()) {
            this._up2Processes.add(process.pid);
            this._sock.emit("processadded", process);
        }

        for (let procWithServices of procsWithServices.values()) {
            for (let procService of procWithServices.services) {
                this._up2ProcessServices.add(procService.intent);
                this._sock.emit("processserviceadded", FE.ProcessService.fromClass(procService));
            }
        }

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

    onServiceData(binderName, binderService) {
        debug(`Service added: ${binderName}->${binderService.name}`);

        if (!this._up2Services.get(binderName).has(binderService.name)) {
            this._up2Services.get(binderName).add(binderService.name);
            this._sock.emit("service", binderName, binderService);
        }
    }

    onProcessAdded(binderProcess) {
        if (!this._up2Processes.has(binderProcess.pid)) {
            debug(`Process added: ${binderProcess.pid}`);

            this._up2Processes.add(binderProcess.pid);
            this._sock.emit("processadded", binderProcess);
        }
        else debug(`Not sending process addition for ${binderProcess.pid}: Already added`);
    }

    onProcessRemoved(processPid) {
        if (this._up2Processes.has(processPid)) {
            debug(`Process gone: ${processPid}`);

            this._up2Processes.delete(processPid);
            this._sock.emit("processremoved", processPid);
        }
        else debug(`Not sending process removal for ${processPid}: Already gone`);
    }

    onProcessServiceAdded(processService) {
        if (!this._up2ProcessServices.has(processService.intent)) {
            debug(`Process Service started: ${processService.intent}, in process ${processService.pid}`);

            this._up2ProcessServices.add(processService.intent);
            this._sock.emit("processserviceadded", FE.ProcessService.fromClass(processService));
        }
    }

    onProcessServiceRemoved(processService) {
        if (this._up2ProcessServices.has(processService.intent)) {
            debug(`Process Service stopped: ${processService.intent}, in ${processService.pid} STOPPED`);

            this._up2ProcessServices.delete(processService.intent);
            this._sock.emit("processserviceremoved", FE.processService.fromClass(processService));
        }
    }
}

module.exports = DataFeeder;
