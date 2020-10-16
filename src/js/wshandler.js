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

define(function (require) {
    const Process = require("models/Process");

    return class WSHandler {
        constructor(sock, binderServices, binderProcesses) {
            this._sock = sock;
            this._binderServices = binderServices;
            this._binderProcesses = binderProcesses;

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

            this._sock.on("service", (data) => {
                this._onService(data);
            });
        }

        _onProcessServiceAdded(userService) {
            if (this._binderProcesses.get(userService.pid) != null)
                this._binderProcesses.get(userService.pid).addUserService(userService);
        }

        _onProcessServiceRemoved(userService) {
            if (this._binderProcesses.get(userService.pid) != null)
                this._binderProcesses.get(userService.pid).removeUserService(userService);
        }

        _onProcessAdded(binderProcess) {
            binderProcess.process = new Process(binderProcess.process);
            this._binderProcesses.add(binderProcess);
        }

        _onProcessRemoved(binderProcessPid) {
            this._binderProcesses.remove(binderProcessPid);
        }

        _onService(binderService) {
            binderService.process = new Process(binderService.process);
            this._binderServices.add(binderService);
        }
    };
});
