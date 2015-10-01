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
    var AidlDialog = require("views/dialog-aidl");
    var ProcDialog = require("views/dialog-process");

    return Backbone.View.extend({

        _dialogId: _.uniqueId("dialog"),

        _setAidl: function (iface, aidl) {
            var self = this, $aidlBtn;

            $aidlBtn = $("#" + self._dialogId + " .ifaceLink");

            $aidlBtn.prop("disabled", false);
            $aidlBtn.click(function (event) {
                new AidlDialog({
                    serviceName: self._service.get("name"),
                    aidl: aidl
                }).render();
            });
        },

        _setProc: function () {
            var self = this, $procLink;

            $procLink = $("#" + self._dialogId + " .procLink");

            $procLink.prop("disabled", false);
            $procLink.click(function (event) {
                new ProcDialog({
                    process: self._processes.get($procLink.attr("data")),
                    services: self._services,
                    processes: self._processes,
                    serviceLinks: self._serviceLinks
                }).render();
            });
        },

        _onDialogOpen: function (event) {
            var self = this, $aidlBtn;
            var iface = self._service.get("iface");
            var name = self._service.get("name");
            var pid = self._service.get("pid");

            event.onComplete = function () {
                $aidlBtn = $("#" + self._dialogId + " .ifaceLink");
                $aidlBtn.prop("disabled", true);

                self._setProc();

                $.ajax("http://" + window.location.host + "/aidl/" + name + "/" + iface, {
                    success: function (data) {
                        self._setAidl(iface, data);
                    },
                    error: function () {
                        $aidlBtn
                            .prop("alt", "No AIDL found for service " + name)
                            .attr("class", "text-danger");
                    }
                });
            };
        },

        render: function () {
            var self = this;
            var iface = self._service.get("iface");
            var name = self._service.get("name");
            var inboundLinks, hasInboundLinks, inboundLinksGroups;

            inboundLinks = self._serviceLinks.getLinksFrom(name, function (a, b) {
                return {
                    pid: b,
                    name: self._processes.get(b).getFriendlyName()
                };
            });
            inboundLinksGroups = _.groupBy(inboundLinks,
                function (value, idx) {
                    return Math.floor(idx / 2);
                });
            hasInboundLinks = inboundLinks.length > 0;

            // This is to fix a kind of broken behavior of w2ui. The dialog callbacks run inside the
            // window context, which means the 'self' capture of 'this' is lost.
            window.__view = self;

            w2popup.open({
                title: "Service details",
                body: self._tmplDialogService({
                    serviceName: self._service.get("name"),
                    hasInboundLinks: hasInboundLinks,
                    inboundLinksGroups: inboundLinksGroups,
                    id: self._dialogId,
                    pid: self._service.get("pid"),
                    iface: iface,
                    nodeid: self._service.get("node")
                }),
                onOpen: function (event) {
                    self._onDialogOpen.apply(window.__view, [event]);
                }
            });
        },

        initialize: function (opts) {
            var self = this;

            self._tmplDialogService = Templates["./src/templates/template-services-dialog.hbs"];
            self._service = opts.service;
            self._processes = opts.processes;
            self._services = opts.services;
            self._serviceLinks = opts.serviceLinks;
        }
    });
});