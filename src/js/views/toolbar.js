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
    var Backbone = require("backbone");
    var _ = require("underscore");
    var w2ui = require("w2ui");

    return Backbone.View.extend({

        placeholder: "__placeholder__",

        _onToolbarClick: function (event) {
            let fun = this._operations.get(event.target);
            fun.execute();
        },

        _onToolbarAfterRender: function (event) {
            // Add the onclick callback on the IMAGE buttons only.
            this._operations.each(function (fun) {
                if (fun.get("image")) {
                    $("#" + fun.get("name")).on("click", function () {
                        this._onToolbarClick({ target: fun.get("id") });
                    });
                }
            });
        },

        _addFunctions: function () {
            let tb = w2ui[this._toolbarName];
            let tbItems = tb.items;

            this._operations.each(function (fun) {
                if (!_.findWhere(tbItems, {id: fun.get("id")})) {
                    if (fun.get("image")) {
                        tbItems.push({
                            type: "html",
                            id: fun.get("id"),
                            html: "<img id='" + fun.get("name") + "'"
                                + " alt='" + fun.get("caption") + "'"
                                + " src='" + fun.get("image") + "'/>"
                        });
                    } else {
                        tbItems.push({
                            type: "button", id: fun.get("id"), caption: fun.get("name")
                        });
                    }
                }
            });

            if (tbItems.length > 1 && tb.get(this.placeholder)) {
                //FIXME: tb.remove(self.placeholder) doesn't work for some reasons!
                tb.items = _.reject(tbItems, (item) => {
                    return item.id == this.placeholder;
                });
            }

            tb.render();
        },

        initialize: function (opts) {
            this._operations = opts.operations;
            this._toolbarName = _.uniqueId("toolbar");
            this._logo = opts.logo;

            this.$el.w2toolbar({
                name: this._toolbarName,
                items: [{ type: "button", id: this.placeholder }]
            });

            w2ui[this._toolbarName].on("click", (event) => {
                this._onToolbarClick.apply(this, [event]);
            });

            w2ui[this._toolbarName].on("render", (event) => {
                event.onComplete = () => {
                    this._onToolbarAfterRender.apply(this, [event]);
                };
            });

            this._operations.on("add", (fun) => {
                this._addFunctions.apply(this, [fun]);
            });

            this._addFunctions();

            w2ui[this._toolbarName].render();
        }
    });
});
