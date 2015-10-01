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

    return Backbone.View.extend({

        initialize: function (opts) {
            var self = this;

            self._tmplProcess = Templates["./src/templates/template-processes.hbs"];
            self._tip = opts.tip;
            self._process = opts.process;

            self._tip.html(function () {
                return self._tmplProcess({
                    pid: self._process.get("pid"),
                    name: self._process.getFriendlyName(),
                    serviceCount: self._process.get("services").length,
                    hasServices: self._process.get("services").length > 0
                });
            });
        },

        render: function () {
            var self = this;
            self._tip.show(self._process);
        },

        hide: function () {
            var self = this;

            self._tip.hide();
        }
    });
});