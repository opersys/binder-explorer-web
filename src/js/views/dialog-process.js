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

define(function (require) {
    "use strict";

    var Backbone = require("backbone");
    var Templates = require("templates");
    var _ = require("underscore");

    return Backbone.View.extend({

        _dialogId: _.uniqueId("dialog"),

        initialize: function (opts) {
            var self = this;

            self._tmplDialogProcess = Templates["./src/templates/template-processes-dialog.hbs"];
            self._process = opts.process;
            self._processes = opts.processes;
            self._services = opts.services;
            self._serviceLinks = opts.serviceLinks;
        },

        _onDialogOpen: function (event) {
            var self = this;

            event.onComplete = function () {
                self._setServiceNameDialogs();
            };
        },

        _setServiceNameDialogs: function () {
            var self = this, $snLinks;

            $snLinks = $("#" + self._dialogId + " .serviceLink");

            $snLinks.each(function () {
                $(this).click(function (event) {
                    var ServiceDialog = require("views/dialog-service");

                    var sn = $(this).attr("data");

                    new ServiceDialog({
                        service: self._services.get(sn),
                        processes: self._processes,
                        services: self._services,
                        serviceLinks: self._serviceLinks
                    }).render();
                });
            });
        },

        render: function () {
            var self = this;
            var outboundLinks, hasOutboundLinks, outboundLinksGroups;
            var userServices, hasUserServices;

            outboundLinks = self._serviceLinks.getLinksFrom(self._process.get("process").get("pid"), function (a, b) {
                return b;
            }).sort();
            outboundLinksGroups = _.groupBy(outboundLinks,
                function (value, idx) {
                    return Math.floor(idx / 4);
                });
            hasOutboundLinks = outboundLinks.length > 0;

            userServices = _.map(self._process.get("services"), function (s) {
                return {
                    intent: s.intent,
                    pkg: s.pkg
                };
            });
            hasUserServices = userServices.length > 0;

            // See dialog-service.js for explanation about this hack.
            window.__view = self;

            w2popup.open({
                title: "Process details",
                width: 600,
                height: 400,
                body: self._tmplDialogProcess({
                    id: self._dialogId,
                    pid: self._process.get("process").get("pid"),
                    cmdline: self._process.get("process").get("cmdline")[0],
                    outboundLinks: outboundLinksGroups,
                    hasOutboundLinks: hasOutboundLinks,
                    userServices: userServices,
                    hasUserServices: hasUserServices
                }),
                onOpen: function (event) {
                    self._onDialogOpen.apply(window.__view, [event]);
                }
            });
        }
    });
});