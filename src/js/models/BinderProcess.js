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
    var _ = require("underscore");

    return Backbone.Model.extend({
        idAttribute: "pid",

        initialize: function () {
            var self = this;

            self.set("services", []);
        },

        getDomId: function () {
            var self = this;
            return "pid_" + self.get("pid");
        },

        // Try to get a friendly name for a process using its command line.
        getFriendlyName: function () {
            var self = this;

            if (self.get("process").get("cmdline") !== null) {
                return self.get("process").get("cmdline")[0];
            }

            // Fallback on just the PID.
            return self.get("pid");
        },

        addUserService: function (userService) {
            var self = this;
            var currentServices = self.get("services");

            if (!_.some(currentServices, function (cs) {
                    return userService.intent === cs.intent;
                })) {
                currentServices.push(userService);
                self.set("services", currentServices);

                this.trigger("serviceadded", userService);
            }
        },

        removeUserService: function (userService) {
            var self = this;
            var currentServices = self.get("services");

            self.set("services", _.reject(currentServices, function (cs) {
                return userService.intent === cs.intent;
            }));

            this.trigger("serviceremoved", userService);
        },

        getServiceRefs: function () {
            var self = this, serviceRefs = [], unknownRefs = [], i;

            _.each(self.get("refs"), function (ref) {
                if ((i = self.collection.getServiceByNode(ref.node))) {
                    serviceRefs.push(i);
                } else {
                    unknownRefs.push(ref.node);
                }
            });

            return { knownRefs: serviceRefs, unknownRefs: unknownRefs };
        }
    });
});