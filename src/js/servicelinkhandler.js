/*
 * Copyright (C) 2015-2018 Opersys inc.
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
 * This class wraps the calculation of links between process and services.
 */
define(function (require) {
    "use strict";

    var d3 = require("d3");
    var Backbone = require("backbone");
    var Linker = require("linkhandler");
    var _ = require("underscore");

    var ServiceLinkHandler = function (services, processes) {
        var self = this;

        self._services = services;
        self._processes = processes;
        self._pendingServiceLinks = {};
        self._links = new Linker.Undirected();

        _.extend(this, Backbone.Events);

        self._services.on("add", function () {
            self._onNewService.apply(self, arguments);
        });

        self._processes.on("add", function () {
            self._onNewProcess.apply(self, arguments);
        });

        self._processes.on("remove", function () {
            self._onRemoveProcess.apply(self, arguments);
        });

        self._links.on("linkadded", function () {
            self._onLinkAdded(self, arguments);
        });

        self._links.on("linkremoved", function () {
            self._onLinkRemoved(self, arguments);
        });
    };

    ServiceLinkHandler.prototype.getLinks = function (makeLinkCb) {
        var self = this;
        return self._links.getLinks(makeLinkCb);
    };

    ServiceLinkHandler.prototype.getLinksFrom = function (a, makeLinkCb) {
        var self = this;
        return self._links.getLinksFrom(a, makeLinkCb);
    };

    ServiceLinkHandler.prototype._onLinkAdded = function (serviceLinks, args) {
        var self = this;
        var process = self._processes.get(args[0]);
        var service = self._services.get(args[1]);

        self.trigger("linkadded", process, service);
    };

    ServiceLinkHandler.prototype._onLinkRemoved = function (serviceLinks, args) {
        var self = this;
        var pid = args[0];
        var serviceName = args[1];

        self.trigger("linkremoved", pid, serviceName);
    };

    ServiceLinkHandler.prototype._onNewService = function (service) {
        var self = this;

        console.log("Service " + service.get("name") + " [Node: " + service.get("node") + "]" + " being added.");

        // Notify the that a service was added.
        self.trigger("serviceadded", service);

        // Update the links
        if (self._pendingServiceLinks[service.get("node")]) {
            var pendingLinks = self._pendingServiceLinks[service.get("node")];

            pendingLinks.forEach(function (processPid) {
                var process = self._processes.get(processPid);
                self._links.addLink(process.get("pid"), service.get("name"));
                self.trigger("linkadded", process, service);

                console.log("Resolved pending link from " + service.get("node") + " to " + process.get("pid"));
            });
        }
    };

    ServiceLinkHandler.prototype._onNewProcess = function (process) {
        var self = this;
        var srefs = process.getServiceRefs();
        var krefs = srefs.knownRefs;
        var urefs = srefs.unknownRefs;

        console.log("Process " + process.get("pid") + " being added.");

        self.trigger("processadded", process);

        krefs.forEach(function (service) {
            self._links.addLink(process.get("pid"), service.get("name"));
            self.trigger("linkadded", process, service);
        });

        urefs.forEach(function (uref) {
            if (!self._pendingServiceLinks[uref]) {
                self._pendingServiceLinks[uref] = d3.set();
            }

            console.log("Pending link from " + uref + " to " + process.get("pid"));

            self._pendingServiceLinks[uref].add(process.get("pid"));
        });
    };

    ServiceLinkHandler.prototype._onRemoveProcess = function (process) {
        var self = this;

        console.log("Process " + process.get("pid") + " being removed.");

        self._links.removeAll(process.get("pid"));
        self.trigger("processremoved", process.get("pid"));
    };

    return ServiceLinkHandler;
});