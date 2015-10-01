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

/**
 * This class wraps the calculation of links between processes
 */
define(function (require) {
    "use strict";

    var d3 = require("d3");
    var Backbone = require("backbone");
    var Linker = require("linkhandler");
    var _ = require("underscore");

    var UserServiceLinkHandler = function (processes) {
        var self = this;

        self._processes = processes;
        self._links = new Linker.Directed();

        _.extend(this, Backbone.Events);

        self._processes.on("serviceadded", function () {
            self._onNewProcessService.apply(self, arguments);
        });

        self._processes.on("serviceremoved", function () {
            self._onRemoveProcessService.apply(self, arguments);
        });

        self._links.on("linkadded", function () {
            self._onLinkAdded(self, arguments);
        });

        self._links.on("linkremoved", function () {
            self._onLinkRemoved(self, arguments);
        });
    };

    UserServiceLinkHandler.prototype.getLinks = function (makeLinkCb) {
        var self = this;
        return self._links.getLinks(makeLinkCb);
    };

    UserServiceLinkHandler.prototype.getLinksFrom = function (a, makeLinkCb) {
        var self = this;
        return self._links.getLinksFrom(a, makeLinkCb);
    };

    UserServiceLinkHandler.prototype._onLinkAdded = function (serviceLinks, args) {
        var self = this;
        var processFrom = self._processes.get(args[0]);
        var processTo = self._processes.get(args[1]);

        self.trigger("linkadded", processFrom, processTo);
    };

    UserServiceLinkHandler.prototype._onLinkRemoved = function (serviceLinks, args) {
        var self = this;
        var processFromPid = args[0];
        var processToPid = args[1];

        self.trigger("linkremoved", processFromPid, processToPid);
    };

    UserServiceLinkHandler.prototype._onNewProcessService = function (userService) {
        var self = this;

        userService.clients.forEach(function (pid) {
            if (self._processes.get(pid) != null) {
                self._links.addLink(userService.pid, pid);
            } else {
                console.log("Target process " + pid + " unknown. Can't make user service link.");
            }
        });
    };

    UserServiceLinkHandler.prototype._onRemoveProcessService = function (userService) {

    };

    return UserServiceLinkHandler;
});