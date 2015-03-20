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
    var Process = require("models/Process");

    return Backbone.Model.extend({
        idAttribute: "pid",

        initialize: function () {
            var self = this;

            // Initialize a new Process object that we can fetch.
            self.set("process", new Process({ pid: self.get("pid") }));
        },

        getServiceRefs: function () {
            var self = this, serviceRefs = [], i;

            _.each(self.get("refs"), function (ref) {
                if ((i = self.collection.getServiceByNode(ref.node)))
                    serviceRefs.push(i);
            });

            return serviceRefs;
        }
    });
});