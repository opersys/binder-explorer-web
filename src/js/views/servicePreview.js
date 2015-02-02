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
    var w2ui = require("w2ui");

    return Backbone.View.extend({

        _serviceSelectedTemplate: _.template(
            "<table style='width: 100%'>"+
                "<tr>" +
                "<td colspan='2'><%= serviceCaption %></td>" +
                "</tr>" +
                "<tr>" +
                "<td></td>" +
                "<td><%= serviceLinks %></td>" +
                "</tr>" +
                "</table>"
        ),

        _noSelection: _.template(
            "Select a service to see informations here"
        ),

        _serviceLinks: _.template(
            "<h2>Inbound links</h2>" +
                "<ul><%= inboundLinksList %></ul>" +
            "<h2>Outbound links</h2>" +
                "<ul><%= outboundLinksList %></ul>"
        ),

        initialize: function () {
        },

        preview: function (binderServices) {
            var self = this;

            if (binderServices.length == 1)
                self._selectedBinderService = binderServices[0];

            self.render();
        },

        render: function () {
            var self = this;

            self.$el = $(self.box);

            if (self._selectedBinderService) {
                self.$el.html(self._serviceSelectedTemplate({
                    serviceCaption: self._selectedBinderService.get("name"),
                    serviceLinks: self._serviceLinks({
                        inboundLinksList: "",
                        outboundLinksList: ""
                    })
                }));
            } else {
                self.$el.html(self._noSelection());
            }
        }
    });
});