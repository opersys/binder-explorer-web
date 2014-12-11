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
    var QueueManager = require("queueManager/QueueManager");
    var NProgress = require("nprogress/nprogress");
    var queue = new QueueManager({ delay: -1 });

    queue.each(function (bbObj) {
        bbObj.fetch({ success: function () {
            console.log("Successfully fetched: something");

            if (queue.size() != 0)
                NProgress.inc(1 / queue.size());
            else
                NProgress.done();

            queue.next();
        }})
    });

    var fetch = function (bbObj) {
        queue.add(bbObj);
    };

    queue.start();

    return { fetch: fetch };
});