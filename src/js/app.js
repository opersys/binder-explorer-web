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
    let $ = require("jquery");
    let MainView = require("views/main");
    let Toolbar = require("views/toolbar");

    const Binder = require("models/Binder");
    const Binders = require("models/Binders");
    const BinderProcesses = require("models/BinderProcesses");
    const BinderServices = require("models/BinderServices");
    const Operations = require("models/Operations");
    const Operation = require("models/Operation");
    const ServiceLinkHandler = require("servicelinkhandler");
    const ProcessServiceLinkHandler = require("procservicelinkhandler");

    let binders = new Binders();
    let operations = new Operations();

    // There is a single process collection passed around.
    let processes = new BinderProcesses([], {binders: binders});

    let binderServices = new BinderServices([], {binderName: "binder"});
    let hwbinderServices = new BinderServices([], {binderName: "hwbinder"});
    let vndbinderServices = new BinderServices([], {binderName: "vndbinder"});
    let linkhandler = new ServiceLinkHandler(binders, processes);
    let proclinkhandler = new ProcessServiceLinkHandler(processes);

    binders.add(new Binder({
        name: "binder",
        services: binderServices,
    }));

    binders.add(new Binder({
        name: "hwbinder",
        services: hwbinderServices,
    }));

    binders.add(new Binder({
        name: "vndbinder",
        services: vndbinderServices
    }));

    let mainView = new MainView({
        el: $("#app"),
        binders: binders,
        operations: operations,
        processes: processes,
        linkhandler: linkhandler,
        proclinkhandler: proclinkhandler
    });

    let mainToolbar = new Toolbar({
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

    let resizeWindow = function () {
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
