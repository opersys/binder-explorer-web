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
    var DependsView = require("views/depends-d3-atom");
    //var ServicesView = require("views/services");
    //var ServicePreview = require("views/servicePreview");
    var $ = require("jquery");
    var w2ui = require("w2ui");
    var ModelLoader = require("modelLoader");
    var Operation = require("models/Operation");

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
            self._binderProcesses = opts.binderProcesses;
            self._operations = opts.operations;
            self._procs = opts.procs;

            self._dependsView = new DependsView({
                binderServices: self._binderServices,
                binderProcesses: self._binderProcesses,
                functions: self._functions
            });

            self._modelLoader = new ModelLoader({
                queueDone: function () {
                    self._dependsView.renderGraph();
                }
            });

            self._modelLoader.fetch({
                item: self._binderServices,

                itemDone: function (modelLoader) {
                    self._binderServices.each(function (binderService) {
                        modelLoader.fetch({
                            item: binderService
                        });
                    });
                }
            });

            self._modelLoader.fetch({
                item: self._binderProcesses,
                itemDone: function (modelLoader) {
                    self._binderProcesses.each(function (binderProcess) {
                        modelLoader.fetch({
                            item: binderProcess,

                            itemDone: function () {

                            }
                        });

                        modelLoader.fetch({
                            item: binderProcess.get("process"),

                            itemDone: function () {
                            }
                        });

                    });
                }
            });

            self._modelLoader.start();

            self.$el.w2layout({
                name: self.getLayoutName(),
                panels: [
                    {
                        type: "main",
                        content: self._dependsView
                    }
                ],
                onResize: function (ev) {
                    ev.onComplete = function () {
                        if (self._dependsView)
                            self._dependsView.resize();
                    };
                }
            });

            self._dependsView.on("depends_view:selected", function () {
                self._onServiceSelected.apply(self, arguments);
            });
        }
    });
});