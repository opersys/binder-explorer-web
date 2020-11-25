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
            this._tmplService = Templates["./src/templates/template-services.hbs"];
            this._tip = opts.tip;
            this._services = opts.services;
            this._service = opts.service;
            this._linkhandler = opts.linkhandler;

            let outboundLinks = this._linkhandler.getLinksFrom(this._service, this._linkhandler.id, (_, b) => {
                return b;
            });

            this._tip.html(() => {
                return this._tmplService({
                    name: this._service.get("name"),
                    outgoingCount: outboundLinks.length,
                    hasOutgoing: outboundLinks.length > 0
                });
            });
        },

        render: function () {
            this._tip.show(this._data);
        },

        hide: function () {
            this._tip.hide();
        }
    });
});
