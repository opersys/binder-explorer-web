/*
 * Copyright (C) 2020 Opersys inc.
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
    const Binder = require("models/Binder");

    return Backbone.Collection.extend({
        url: "/binders",
        model: Binder,

        /*
         * This is the catalog of Node to Service object. Because
         * nodes are unique in the Binder driver, we put this at the
         * root of the object hierarchy.
         */

        getServicesByNode: function (nodeId) {
            console.assert(Number.isInteger(nodeId));
            if (this._servicesByNode.has(nodeId))
                return this._servicesByNode.get(nodeId);
            else
                return [];
        },

        initialize: function () {
            this._servicesByNode = new Map();

            /*
             * For each binder that is added, we hook onto the
             * collection to know when new services get added. When
             * new service get added, we can make the node ID to
             * service binding.
             */
            this.on("add", (binder) => {
                binder.get("services").on("add", (service) => {

                    /*
                     * The same node can serve multiple service
                     * names. This is mostly (only) used for hwbinder
                     * services.
                     */

                    let n = service.get("node");

                    if (!this._servicesByNode.has(n))
                        this._servicesByNode.set(n, []);

                    this._servicesByNode.get(n).push(service);
                });
            });
        }
    });
});
