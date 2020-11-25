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
    var Templates = require("templates");

    return Backbone.View.extend({

        initialize: function (opts) {
            this._tmplProcess = Templates["./src/templates/template-processes.hbs"];
            this._tip = opts.tip;
            this._process = opts.process;

            this._tip.html(() => {
                return this._tmplProcess({
                    pid: this._process.get("pid"),
                    name: this._process.getFriendlyName(),
                    serviceCount: this._process.get("services").length,
                    hasServices: this._process.get("services").length > 0
                });
            });
        },

        render: function () {
            this._tip.show(this._process);
        },

        hide: function () {
            this._tip.hide();
        }
    });
});
