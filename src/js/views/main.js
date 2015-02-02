/*
 * Copyright (C) 2014 Opersys inc.
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
    var DependsView = require("views/depends-d3");
    var ServicesView = require("views/services");
    var ServicePreview = require("views/servicePreview");
    var $ = require("jquery");
    var w2ui = require("w2ui");

    return Backbone.View.extend({

        _dependsView: null,

        getLayoutName: function () {
            return "layout";
        },

        _onServiceSelected: function (selectedBinderServices) {
            var self = this;

            self._dependsView.select(selectedBinderServices);
            self._servicePreview.preview(selectedBinderServices);
        },

        _onServiceUnselected: function (unselectedBinderServices) {
            var self = this;

            self._dependsView.unselect(unselectedBinderServices);
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._functions = opts.functions;
            self._procs = opts.procs;

            self._dependsView = new DependsView({
                binderServices: self._binderServices,
                functions: self._functions
            });

            self._servicesView = new ServicesView({
                binderServices: self._binderServices
            });

            self._servicePreview = new ServicePreview({
            });

            self.$el.w2layout({
                name: self.getLayoutName(),
                panels: [
                    {
                        type: "main",
                        content: self._dependsView
                    },
                    {
                        type: "left",
                        content: self._servicesView,
                        size: 300
                    },
                    {
                        type: "preview",
                        content: self._servicePreview,
                        resizable: true
                    }
                ],
                onResize: function (ev) {
                    ev.onComplete = function () {
                        if (self._dependsView)
                            self._dependsView.resize();
                    };
                }
            });

            self._servicesView.on("services_view:selected", function () {
                self._onServiceSelected.apply(self, arguments);
            });

            self._servicesView.on("services_view:unselected", function () {
                self._onServiceUnselected.apply(self, arguments);
            });

            self._dependsView.on("depends_view:selected", function () {
                self._onServiceSelected.apply(self, arguments);
            });
        }
    });
});