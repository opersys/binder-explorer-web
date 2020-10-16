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

    const Backbone = require("backbone");
    const Linker = require("linkhandler");
    const _ = require("underscore");

    const UserServiceLinkHandler = function (processes) {
        this._processes = processes;
        this._links = new Linker.Directed();

        _.extend(this, Backbone.Events);

        this._processes.on("serviceadded", (s) => {
            this._onNewProcessService(s);
        });

        this._processes.on("serviceremoved", (s) => {
            this._onRemoveProcessService(s);
        });

        this._links.on("linkadded", (f, t) => {
            this._onLinkAdded(f, t);
        });

        this._links.on("linkremoved", (f, t) => {
            this._onLinkRemoved(f, t);
        });
    };

    UserServiceLinkHandler.prototype.getLinks = function (makeLinkCb) {
        return this._links.getLinks(makeLinkCb);
    };

    UserServiceLinkHandler.prototype.getLinksFrom = function (a, makeLinkCb) {
        return this._links.getLinksFrom(a, makeLinkCb);
    };

    UserServiceLinkHandler.prototype._onLinkAdded = function (serviceLinks, args) {
        let processFrom = this._processes.get(args[0]);
        let processTo = this._processes.get(args[1]);

        this.trigger("linkadded", processFrom, processTo);
    };

    UserServiceLinkHandler.prototype._onLinkRemoved = function (serviceLinks, args) {
        let processFromPid = args[0];
        let processToPid = args[1];

        this.trigger("linkremoved", processFromPid, processToPid);
    };

    UserServiceLinkHandler.prototype._onNewProcessService = function (userService) {
        userService.clients.forEach((pid) => {
            if (this._processes.get(pid) !== null)

                // Filter out self-referential service, which can be rendered.
                if (userService.pid !== pid)
                    this._links.addLink(userService.pid, pid);
            else
                console.log("Target process " + pid + " unknown. Can't make user service link.");
        });
    };

    UserServiceLinkHandler.prototype._onRemoveProcessService = function (userService) {};

    return UserServiceLinkHandler;
});
