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
    var _ = require("underscore");
    var w2ui = require("w2ui");

    return Backbone.View.extend({

        placeholder: "__placeholder__",

        _onToolbarClick: function (event) {
            var self = this;
            var fun = self._functions.get(event.target)

            fun.execute();
        },

        _onFunctionAdd: function (fun) {
            var self = this;
            var tb = w2ui[self._toolbarName];
            var tbItems = tb.items;

            self._functions.each(function (fun) {
                if (!_.findWhere(tbItems, {id: fun.get("id")})) {
                    tbItems.push({
                        type: "button", id: fun.get("id"), caption: fun.get("name")
                    });
                }
            });

            if (tbItems.length > 1 && tb.get(self.placeholder)) {
                //FIXME: tb.remove(self.placeholder) doesn't work for some reasons!
                tb.items = _.reject(tbItems, function (item) {
                    return item.id == self.placeholder;
                });
            }

            tb.refresh();
        },

        initialize: function (opts) {
            var self = this;

            self._functions = opts.functions;
            self._toolbarName = _.uniqueId("toolbar");

            self.$el.w2toolbar({
                name: self._toolbarName,
                items: [{ type: "button", id: self.placeholder }]
            });

            w2ui[self._toolbarName].on("click", function (event) {
                self._onToolbarClick.apply(self, [event])
            });

            self._functions.on("add", function (fun) {
                self._onFunctionAdd.apply(self, [fun]);
            });
        }
    });
});