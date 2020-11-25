/*
 * Copyright (C) 2014-2020 Opersys inc.
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
    const Backbone = require("backbone");

    return Backbone.Model.extend({
        idAttribute: "pid",

        initialize: function () {
            this.set("services", []);
        },

        getDomId: function () {
            return "pid_" + this.get("pid");
        },

        // Try to get a friendly name for a process using its command line.
        getFriendlyName: function () {
            if (this.get("process").get("cmdline") !== null)
                return this.get("process").get("cmdline")[0];

            // Fallback on just the PID.
            return this.get("pid");
        },

        addProcessService: function (procService) {
            let currentServices = this.get("services");

            if (!currentServices.some((cs) => procService.intent == cs.intent)) {
                currentServices.push(procService);
                this.set("services", currentServices);
                this.trigger("processserviceadded", procService);
            }
        },

        removeProcessService: function (procService) {
            let currentServices = this.get("services");

            this.set("services", currentServices.filter((cs) => procService.intent !== cs.intent));
            this.trigger("processserviceremoved", procService);
        },

        getServiceRefs: function () {
            let serviceRefs = [], unknownRefs = [];

            for (let ref of this.get("refs")) {
                let services = this.collection.getBinders().getServicesByNode(ref.node);

                if (services.length > 0)
                    for (let service of services)
                        serviceRefs.push(service);
                else
                    unknownRefs.push(ref.node);
            }

            return { knownRefs: serviceRefs, unknownRefs: unknownRefs };
        }
    });
});
