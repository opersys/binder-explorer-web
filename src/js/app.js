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
    var $ = require("jquery");
    var MainView = require("views/main");
    var Toolbar = require("views/toolbar");
    var BinderProcesses = require("models/BinderProcesses");
    var BinderServices = require("models/BinderServices");
    var Operations = require("models/Operations");
    var Operation = require("models/Operation");
    var ServiceLinkHandler = require("servicelinkhandler");

    var binderServices = new BinderServices();
    var binderProcesses = new BinderProcesses([], { binderServices: binderServices });
    var serviceLinks = new ServiceLinkHandler(binderServices, binderProcesses);
    var operations = new Operations();

    var mainView = new MainView({
        el: $("#app"),
        binderServices: binderServices,
        binderProcesses: binderProcesses,
        serviceLinks: serviceLinks,
        operations: operations
    });

    var mainToolbar = new Toolbar({
        el: $("#toolbar"),
        operations: operations
    });

    operations.add(new Operation({
        id: "homepage",
        name: "opOpersysSite",
        caption: "Opersys Site",
        image: "images/opersys_land_logo.png",
        context: mainView,

        callback: function () {
            window.location = "http://opersys.com";
        }
    }));

    operations.add(new Operation({
        id: "about",
        name: "opAbout",
        caption: "Copyright",
        image: "images/copyright.png",
        context: mainView,

        callback: function () {
            w2popup.load({
                width: "640",
                height: "480",
                url: "/apropos.html"
            });
        }
    }));

    var resizeWindow = function () {
        $("#app")
            .width($(window).width())
            .height($(window).height() - $("#toolbar").outerHeight());

        w2ui[mainView.getLayoutName()].resize();
    };

    $(window).resize(_.debounce(resizeWindow, 100));
    mainToolbar.on("resize", resizeWindow);

    // Reformat the window content.
    resizeWindow();
});