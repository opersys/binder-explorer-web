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

/**
 * This class wraps the calculation of links between process and services.
 */
define(function (require) {
    "use strict";

    const d3 = require("d3");
    const Backbone = require("backbone");
    const Linker = require("linkhandler");
    const _ = require("underscore");

    const ServiceLinkHandler = function (binders, processes) {
        this._binders = binders;
        this._processes = processes;
        this._pendingServiceLinks = new Map();
        this._links = new Linker.Undirected();

        _.extend(this, Backbone.Events);

        binders.on("add", (binder) => {
            binder.get("services").on("add", (m, c, opts) => {
                this._onNewService(m, c, opts);
            });
        });

        this._processes.on("add", (m, c, opts) => {
            this._onNewProcess(m, c, opts);
        });

        this._processes.on("remove", (m, c, opts) => {
            this._onRemoveProcess(m, c, opts);
        });

        this._links.on("linkadded", (from, to) => {
            this._onLinkAdded(from, to);
        });

        this._links.on("linkremoved", (from, to) => {
            this._onLinkRemoved(from, to);
        });
    };

    ServiceLinkHandler.prototype.id = (m) => {
        if (m.has("name"))
            return m.collection.getBinderName() + "%%" + m.get("name");
        else if (m.has("process"))
            return m.get("pid");

        throw `You passed me a weird object here: ${m}`;
    };

    ServiceLinkHandler.prototype.getLinks = function (id, makeLinkCb) {
        return this._links.getLinks(id, makeLinkCb);
    };

    ServiceLinkHandler.prototype.getLinksFrom = function (a, id, makeLinkCb) {
        return this._links.getLinksFrom(a, id, makeLinkCb);
    };

    ServiceLinkHandler.prototype._onLinkAdded = function (process, service) {
        this.trigger("linkadded", process, service);
    };

    ServiceLinkHandler.prototype._onLinkRemoved = function (process, service) {
        this.trigger("linkremoved", process, service);
    };

    ServiceLinkHandler.prototype._onNewService = function (service, services) {
        let binderName = services.getBinderName();

        // Notify the that a service was added.
        this.trigger("serviceadded", binderName, service);

        // Update the links
        if (this._pendingServiceLinks.has(service.get("node"))) {
            let pendingLinks = this._pendingServiceLinks.get(service.get("node"));

            for (let processPid of pendingLinks) {
                let process = this._processes.get(processPid);
                this._links.addLink(process, service, this.id);
                this.trigger("linkadded", process, service);

                console.log(`Resolved pending link from service ${service.get("name")} to PID ${process.get("pid")} (left pending: ${pendingLinks.length})`);
            }
        }
    };

    ServiceLinkHandler.prototype._onNewProcess = function (process) {
        let srefs = process.getServiceRefs();
        let krefs = srefs.knownRefs;
        let urefs = srefs.unknownRefs;

        console.log(`Process ${process.get("pid")} being added (${krefs.length} known refs, ${urefs.length} unknown refs)`);

        this.trigger("processadded", process);

        for (let service of krefs) {
            this._links.addLink(process, service, this.id);
            this.trigger("linkadded", process, service);
        }

        for (let uref of urefs) {
            if (!this._pendingServiceLinks.get(uref))
                this._pendingServiceLinks.set(uref, new Set());

            console.log(`Pending link from Node ${uref} to PID ${process.get("pid")} (pending: ${this._pendingServiceLinks.size})`);

            this._pendingServiceLinks.get(uref).add(process.get("pid"));
        }
    };

    ServiceLinkHandler.prototype._onRemoveProcess = function (process) {
        console.log(`PID ${process.get("pid")} being removed`);

        this._links.removeAll(process.get("pid"));
        this.trigger("processremoved", process.get("pid"));
    };

    return ServiceLinkHandler;
});
