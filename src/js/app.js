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
    var $ = require("jquery");
    var MainView = require("views/main");
    var Toolbar = require("views/toolbar");
    var BinderServices = require("models/BinderServices");
    var Functions = require("models/Functions");
    var modelLoader = require("modelLoader");

    var binderServices = new BinderServices();
    var functions = new Functions();

    modelLoader.fetch(binderServices);

    var mainView = new MainView({
        el: $("#app"),
        binderServices: binderServices,
        functions: functions
    });

    var mainToolbar = new Toolbar({
        el: $("#toolbar"),
        functions: functions
    });

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