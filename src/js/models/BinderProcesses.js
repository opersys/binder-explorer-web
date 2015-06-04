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
    var BinderProcess = require("models/BinderProcess");

    return Backbone.Collection.extend({
        url: "/binder/procs",
        model: BinderProcess,

        initialize: function (attrs, opts) {
            var self = this;

            self._binderServices = opts.binderServices;

            self.on("change:node", function (m) {
                self._serviceByNodeId[m.get("node")] = m;
            });

            self.on("add", function (binderProcess) {
                binderProcess.fetch({
                    success: function () {
                        if (binderProcess.get("process")) {
                            binderProcess.get("process").fetch();
                        }
                    }
                });
            });
        },

        getServiceByNode: function (n) {
            var self = this;
            return self._binderServices.getServiceByNode(n);
        }
    });
});