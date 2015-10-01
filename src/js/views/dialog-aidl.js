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
    require("highlightjs"); // Oddly, this exports 'hljs' automatically.

    return Backbone.View.extend({

        _dialogId: _.uniqueId("dialog"),

        initialize: function (opts) {
            var self = this;

            self._tmplDialogAidl = Templates["./src/templates/template-aidl-dialog.hbs"];
            self._aidl = opts.aidl;
            self._serviceName = opts.serviceName;
        },

        _onDialogOpen: function () {
            var self = this;
            var hl, dialogBody, pre;

            dialogBody = $("#" + self._dialogId + "> .aidl");
            hl = hljs.highlight("java", self._aidl, true);

            pre = $("<pre></pre>");
            $.each($.parseHTML(hl.value), function (i, el) {
                pre.append(el);
            });

            dialogBody.append(pre);
        },

        render: function (id) {
            var self = this;

            // This is to fix a kind of broken behavior of w2ui. The dialog callbacks run inside the
            // window context, which means the 'self' capture of 'this' is lost.
            window.__view = self;

            w2popup.open({
                title: "Service AIDL: " + self._serviceName,
                width: 700,
                height: 500,
                showMax: true,
                body: self._tmplDialogAidl({
                    serviceName: self._serviceName,
                    id: self._dialogId
                }),
                onOpen: function (event) {
                    event.onComplete = function () {
                        self._onDialogOpen.apply(window.__view, [event]);
                    };
                }
            });
        }
    });
});