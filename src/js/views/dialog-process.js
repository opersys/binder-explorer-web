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

define(function (require) {
    "use strict";

    const Backbone = require("backbone");
    const Templates = require("templates");
    const $ = require("jquery");
    const _ = require("underscore");

    return Backbone.View.extend({

        _dialogId: _.uniqueId("dialog"),

        initialize: function (opts) {
            this._tmplDialogProcess = Templates["./src/templates/template-processes-dialog.hbs"];
            this._process = opts.process;
            this._processes = opts.processes;
            this._services = opts.services;
            this._linkhandler = opts.linkhandler;
        },

        _onDialogOpen: function (event) {
            event.onComplete = () => {
                this._setServiceNameDialogs();
            };
        },

        _setServiceNameDialogs: function () {
            let $snLinks;

            $snLinks = $("#" + this._dialogId + " .serviceLink");

            $snLinks.each(() => {
                $(this).click((event) => {
                    let ServiceDialog = require("views/dialog-service");

                    let sn = $(this).attr("data");

                    new ServiceDialog({
                        service: this._services.get(sn),
                        processes: this._processes,
                        services: this._services,
                        linkhandler: this._linkhandler
                    }).render();
                });
            });
        },

        render: function () {
            let outboundLinks, hasOutboundLinks, outboundLinksGroups;
            let procServices, hasProcServices;

            outboundLinks = this._linkhandler.getLinksFrom(this._process, this._linkhandler.id, (_, b) => {
                return b.get("name");
            }).sort();
            outboundLinksGroups = _.groupBy(outboundLinks,
                function (value, idx) {
                    return Math.floor(idx / 4);
                });
            hasOutboundLinks = outboundLinks.length > 0;

            procServices = this._process.get("services").map((s) => {
                return {
                    intent: s.intent,
                    pkg: s.pkg
                };
            });

            hasProcServices = procServices.length > 0;

            // See dialog-service.js for explanation about this hack.
            window.__view = this;

            w2popup.open({
                title: "Process details",
                width: 600,
                height: 400,
                body: this._tmplDialogProcess({
                    id: this._dialogId,
                    pid: this._process.get("process").get("pid"),
                    cmdline: this._process.get("process").get("cmdline")[0],
                    outboundLinks: outboundLinksGroups,
                    hasOutboundLinks: hasOutboundLinks,
                    procServices: procServices,
                    hasProcServices: hasProcServices
                }),
                onOpen: (event) => {
                    this._onDialogOpen.apply(window.__view, [event]);
                }
            });
        }
    });
});
