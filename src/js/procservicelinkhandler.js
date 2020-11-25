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
 * This class wraps the calculation of links between processes
 */
define(function (require) {
    "use strict";

    const Backbone = require("backbone");
    const Linker = require("linkhandler");
    const _ = require("underscore");

    const ProcServiceLinkHandler = function (processes) {
        this._processes = processes;
        this._links = new Linker.Directed();

        _.extend(this, Backbone.Events);

        this._processes.on("processserviceadded", (s) => {
            this._onNewProcessService(s);
        });

        this._processes.on("processserviceremoved", (s) => {
            this._onRemoveProcessService(s);
        });

        this._links.on("linkadded", (f, t) => {
            this._onLinkAdded(f, t);
        });

        this._links.on("linkremoved", (f, t) => {
            this._onLinkRemoved(f, t);
        });
    };

    ProcServiceLinkHandler.prototype.id = (m) => {
        if (m.hasOwnProperty('pid'))
            return m.pid;
        else
            return m.get("pid");
    };

    ProcServiceLinkHandler.prototype.getLinks = function (makeLink) {
        return this._links.getLinks(makeLink);
    };

    ProcServiceLinkHandler.prototype.getLinksFrom = function (a, makeLink) {
        return this._links.getLinksFrom(a, this.id, makeLink);
    };

    ProcServiceLinkHandler.prototype._onLinkAdded = function (serviceLinks, args) {
        let processFrom = this._processes.get(args[0]);
        let processTo = this._processes.get(args[1]);

        this.trigger("linkadded", processFrom, processTo);
    };

    ProcServiceLinkHandler.prototype._onLinkRemoved = function (serviceLinks, args) {
        let processFromPid = args[0];
        let processToPid = args[1];

        this.trigger("linkremoved", processFromPid, processToPid);
    };

    ProcServiceLinkHandler.prototype._onNewProcessService = function (procService) {
        procService.clients.forEach((toPid) => {
            if (this._processes.get(toPid) !== null) {
                let fromProc = this._processes.get(procService.pid);
                let toProc = this._processes.get(toPid);

                // Filter out self-referential service, which can't be rendered.
                if (procService.pid !== toPid)
                    this._links.addLink(fromProc, toProc, this.id);
            }
            else console.log(`Target process ${toPid} unknown. Can't make process service link`);
        });
    };

    ProcServiceLinkHandler.prototype._onRemoveProcessService = function (procService) {};

    return ProcServiceLinkHandler;
});
