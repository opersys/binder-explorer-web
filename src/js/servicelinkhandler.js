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

    const d3 = require("d3");
    const Backbone = require("backbone");
    const Linker = require("linkhandler");
    const _ = require("underscore");

    const ServiceLinkHandler = function (services, processes) {
        this._services = services;
        this._processes = processes;
        this._pendingServiceLinks = {};
        this._links = new Linker.Undirected();

        _.extend(this, Backbone.Events);

        this._services.on("add", (m, c, opts) => {
            this._onNewService(m, c, opts);
        });

        this._processes.on("add", (m, c, opts) => {
            this._onNewProcess(m, c, opts);
        });

        this._processes.on("remove", (m, c, opts) => {
            this._onRemoveProcess(m, c, opts);
        });

        this._links.on("linkadded", (f, t) => {
            this._onLinkAdded(f, t);
        });

        this._links.on("linkremoved", (f, t) => {
            this._onLinkRemoved(f, t);
        });
    };

    ServiceLinkHandler.prototype.getLinks = function (makeLinkCb) {
        return this._links.getLinks(makeLinkCb);
    };

    ServiceLinkHandler.prototype.getLinksFrom = function (a, makeLinkCb) {
        return this._links.getLinksFrom(a, makeLinkCb);
    };

    ServiceLinkHandler.prototype._onLinkAdded = function (serviceLinks, args) {
        let process = this._processes.get(args[0]);
        let service = this._services.get(args[1]);

        this.trigger("linkadded", process, service);
    };

    ServiceLinkHandler.prototype._onLinkRemoved = function (serviceLinks, args) {
        let pid = args[0];
        let serviceName = args[1];

        this.trigger("linkremoved", pid, serviceName);
    };

    ServiceLinkHandler.prototype._onNewService = function (service) {
        console.log("Service " + service.get("name") + " [Node: " + service.get("node") + "]" + " being added.");

        // Notify the that a service was added.
        this.trigger("serviceadded", service);

        // Update the links
        if (this._pendingServiceLinks[service.get("node")]) {
            var pendingLinks = this._pendingServiceLinks[service.get("node")];

            pendingLinks.forEach((processPid) => {
                var process = this._processes.get(processPid);
                this._links.addLink(process.get("pid"), service.get("name"));
                this.trigger("linkadded", process, service);

                console.log("Resolved pending link from " + service.get("node") + " to " + process.get("pid"));
            });
        }
    };

    ServiceLinkHandler.prototype._onNewProcess = function (process) {
        let srefs = process.getServiceRefs();
        let krefs = srefs.knownRefs;
        let urefs = srefs.unknownRefs;

        console.log("Process " + process.get("pid") + " being added.");

        this.trigger("processadded", process);

        krefs.forEach((service) => {
            this._links.addLink(process.get("pid"), service.get("name"));
            this.trigger("linkadded", process, service);
        });

        urefs.forEach((uref) => {
            if (!this._pendingServiceLinks[uref])
                this._pendingServiceLinks[uref] = d3.set();

            console.log("Pending link from " + uref + " to " + process.get("pid"));

            this._pendingServiceLinks[uref].add(process.get("pid"));
        });
    };

    ServiceLinkHandler.prototype._onRemoveProcess = function (process) {
        console.log("Process " + process.get("pid") + " being removed.");

        this._links.removeAll(process.get("pid"));
        this.trigger("processremoved", process.get("pid"));
    };

    return ServiceLinkHandler;
});
