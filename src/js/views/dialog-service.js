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

    var Backbone = require("backbone");
    var Templates = require("templates");
    var _ = require("underscore");
    var AidlDialog = require("views/dialog-aidl");
    var ProcDialog = require("views/dialog-process");

    return Backbone.View.extend({

        _dialogId: _.uniqueId("dialog"),

        _setAidl: function (iface, aidl) {
            let $aidlBtn;

            $aidlBtn = $("#" + this._dialogId + " .ifaceLink");

            $aidlBtn.prop("disabled", false);
            $aidlBtn.click((event) => {
                new AidlDialog({
                    serviceName: this._service.get("name"),
                    aidl: aidl
                }).render();
            });
        },

        _setProc: function () {
            var $procLink;

            $procLink = $("#" + this._dialogId + " .procLink");

            $procLink.prop("disabled", false);
            $procLink.click((event) => {
                new ProcDialog({
                    process: this._processes.get($procLink.attr("data")),
                    services: this._services,
                    processes: this._processes,
                    linkhandler: this._linkhandler
                }).render();
            });
        },

        _onDialogOpen: function (event) {
            var $aidlBtn;
            var iface = this._service.get("iface");
            var name = this._service.get("name");
            var pid = this._service.get("pid");

            event.onComplete = () => {
                $aidlBtn = $("#" + this._dialogId + " .ifaceLink");
                $aidlBtn.prop("disabled", true);

                this._setProc();

                $.ajax("http://" + window.location.host + "/aidl/" + name + "/" + iface, {
                    success: (data) => {
                        this._setAidl(iface, data);
                    },
                    error: () => {
                        $aidlBtn
                            .prop("alt", "No AIDL found for service " + name)
                            .attr("class", "text-danger");
                    }
                });
            };
        },

        render: function () {
            let iface = this._service.get("iface");
            let inboundLinks, hasInboundLinks, inboundLinksGroups;

            inboundLinks = this._linkhandler.getLinksFrom(this._service, this._linkhandler.id, (_, b) => {
                return {
                    pid: b.get("pid"),
                    name: this._processes.get(b).getFriendlyName()
                };
            }, );
            inboundLinksGroups = _.groupBy(inboundLinks,
                (_, idx) => {
                    return Math.floor(idx / 2);
                });
            hasInboundLinks = inboundLinks.length > 0;

            // This is to fix a kind of broken behavior of w2ui. The dialog callbacks run inside the
            // window context, which means the 'self' capture of 'this' is lost.
            window.__view = this;

            w2popup.open({
                title: "Service details",
                width: 600,
                height: 500,
                body: this._tmplDialogService({
                    serviceName: this._service.get("name"),
                    hasInboundLinks: hasInboundLinks,
                    inboundLinksGroups: inboundLinksGroups,
                    id: this._dialogId,
                    pid: this._service.get("pid"),
                    iface: iface,
                    nodeid: this._service.get("node")
                }),
                onOpen: (event) => {
                    this._onDialogOpen.apply(window.__view, [event]);
                }
            });
        },

        initialize: function (opts) {
            this._tmplDialogService = Templates["./src/templates/template-services-dialog.hbs"];
            this._service = opts.service;
            this._processes = opts.processes;
            this._services = opts.services;
            this._linkhandler = opts.linkhandler;
        }
    });
});
