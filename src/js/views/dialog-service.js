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
    var Backbone = require("backbone");
    var Templates = require("templates");
    var _ = require("underscore");
    var AidlDialog = require("views/dialog-aidl");

    return Backbone.View.extend({

        _dialogId: _.uniqueId("dialog"),

        initialize: function (data, serviceLinks) {
            var self = this;

            self._tmplDialogService = Templates["./src/templates/template-services-dialog.hbs"];
            self._data = data;
            self._serviceLinks = serviceLinks;
        },

        _openAidlDialog: function (aidl) {
            var self = this;
            new AidlDialog(self._data.get("name"), aidl).render();
        },

        _setAidl: function (aidl) {
            var self = this, $aidl;

            $aidl = $("#" + self._dialogId + " .aidl");

            if (aidl) {
                $aidl.append(
                    $("<a></a>")
                        .attr("href", "#")
                        .click(function () {
                            self._openAidlDialog(aidl);
                        })
                        .text("AIDL interface"));
            } else {
                $aidl.text("Could not get the AIDL interface of this service");
            }
        },

        _onDialogOpen: function (event) {
            var self = this;
            var iface = self._data.get("iface");
            var name = self._data.get("name");

            event.onComplete = function () {
                $.ajax("http://" + window.location.host + "/aidl/" + name + "/" + iface, {
                    success: function (data) {
                        self._setAidl(data);
                    },
                    error: function () {
                        self._setAidl();
                    }
                });
            };
        },

        render: function () {
            var self = this;
            var iface = self._data.get("iface");
            var name = self._data.get("name");
            var inboundLinks, hasInboundLinks;

            inboundLinks = self._serviceLinks.getLinksFrom(name, function (a, b) {
                return b;
            });
            hasInboundLinks = inboundLinks.length > 0;

            // This is to fix a kind of broken behavior of w2ui. The dialog callbacks run inside the
            // window context, which means the 'self' capture of 'this' is lost.
            window.__view = self;

            w2popup.open({
                title: "Service details",
                body: self._tmplDialogService({
                    serviceName: self._data.get("name"),
                    hasInboundLinks: hasInboundLinks,
                    inboundLinks: inboundLinks,
                    id: self._dialogId
                }),
                onOpen: function (event) {
                    self._onDialogOpen.apply(window.__view, [event]);
                }
            });
        }
    });
});