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
    var BinderService = require("models/BinderService");
    var _ = require("underscore");

    return Backbone.Collection.extend({
        url: "/binder/services",
        model: BinderService,

        _serviceByNodeId: {},

        initialize: function () {
            var self = this;

            self.on("change:node", function (m) {
                self._serviceByNodeId[m.get("node")] = m;
            });

            // The model is only ever partially loaded when its added to the
            // collection so this makes the model load itself from the backend.
            self.on("add", function (m) {
                if (_.keys(m.attributes).length === 1) {
                    m.fetch();
                }
            });
        },

        getServiceByNode: function (n) {
            var self = this;
            return self._serviceByNodeId[n];
        }
    });
});
