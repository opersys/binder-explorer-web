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
    var WSHandler = function (sock, binderServices, binderProcesses) {
        var self = this;

        self._sock = sock;
        self._binderServices = binderServices;
        self._binderProcesses = binderProcesses;

        self._sock.on("processadded", function (data) {
            self._onProcessAdded.apply(self, [data]);
        });

        self._sock.on("processremoved", function (data) {
            self._onProcessRemoved.apply(self, [data]);
        });

        self._sock.on("processserviceadded", function (data) {
            self._onProcessServiceAdded.apply(self, [data]);
        });

        self._sock.on("processserviceremoved", function (data) {
            self._onProcessServiceRemoved.apply(self, [data]);
        });

        self._sock.on("service", function (data) {
            self._onService.apply(self, [data]);
        });
    };

    WSHandler.prototype._onProcessServiceAdded = function (userService) {
        var self = this;

        if (self._binderProcesses.get(userService.pid) !== null) {
            self._binderProcesses.get(userService.pid).addUserService(userService);
        }
    };

    WSHandler.prototype._onProcessServiceRemoved = function (userService) {
        var self = this;

        if (self._binderProcesses.get(userService.pid) !== null) {
            self._binderProcesses.get(userService.pid).removeUserService(userService);
        }
    };

    WSHandler.prototype._onProcessAdded = function (binderProcess) {
        this._binderProcesses.add(binderProcess);
    };

    WSHandler.prototype._onProcessRemoved = function (binderProcessPid) {
        this._binderProcesses.remove(binderProcessPid);
    };

    WSHandler.prototype._onService = function (binderService) {
        this._binderServices.add(binderService);
    };

    return WSHandler;
});