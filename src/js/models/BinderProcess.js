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
    var Process = require("models/Process");
    var Backbone = require("backbone");

    return Backbone.RelationalModel.extend({
        idAttribute: "pid",

        SERVICE_TYPE_NATIVE: 1,
        SERVICE_TYPE_VM: 2,
        SERVICE_TYPE_UNKNOWN: -1,

        relations: [{
            type: Backbone.HasOne,
            key: "process",
            relatedModel: Process
        }],

        parse: function (resp, opts) {
            // Because backbone-relational will override the key attribute I use,
            // I copy the key (the PID), to another attribute and make that other
            // attribute the key attribute. The PID of the process is then accessible
            // even if the Process object isn't fetched yet.
            resp["process"] = resp["pid"];
            return Backbone.Model.prototype.parse.apply(this, arguments);
        },

        getServiceType: function () {
            var self = this;

            if (self.get("process") == null)
                return self.SERVICE_TYPE_UNKNOWN;
            else {
                return /^\//.test(self.get("process").get("cmdline")) ?
                    self.SERVICE_TYPE_NATIVE : self.SERVICE_TYPE_VM;
            }
        }
    });
});