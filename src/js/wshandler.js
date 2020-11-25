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

define(function (require) {
    const Process = require("models/Process");

    return class WSHandler {
        constructor(sock, binders, processes) {
            this._sock = sock;
            this._binders = binders;
            this._processes = processes;

            this._sock.on("processadded", (data) => {
                this._onProcessAdded(data);
            });

            this._sock.on("processremoved", (data) => {
                this._onProcessRemoved(data);
            });

            this._sock.on("processserviceadded", (data) => {
                this._onProcessServiceAdded(data);
            });

            this._sock.on("processserviceremoved", (data) => {
                this._onProcessServiceRemoved(data);
            });

            this._sock.on("service", (binderName, data) => {
                this._onService(binderName, data);
            });
        }

        _onProcessServiceAdded(procService) {
            if (this._processes.get(procService.pid) != null)
                this._processes.get(procService.pid).addProcessService(procService);
        }

        _onProcessServiceRemoved(procService) {
            if (this._processes.get(procService.pid) != null)
                this._processes.get(procService.pid).removeProcessService(procService);
        }

        _onProcessAdded(binderProcess) {
            binderProcess.process = new Process(binderProcess.process);
            this._processes.add(binderProcess);
        }

        _onProcessRemoved(binderProcessPid) {
            this._processes.remove(binderProcessPid);
        }

        _onService(binderName, binderService) {
            //binderService.process = new Process(binderService.process);
            //this._binderServices.add(binderService);
            this._binders.get(binderName).get("services").add(binderService);
        }
    };
});
