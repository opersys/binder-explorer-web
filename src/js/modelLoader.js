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
    var NProgress = require("nprogress/nprogress");
    var QueueManager = require("queueManager/QueueManager");
    var _ = require("underscore");

    return function (opts) {
        var self = this;
        var cbQueueDone = opts.queueDone;
        var batch = opts.batch || 5;

        // We maintain a count for the object since we only
        // care about knowing when all of them have been successfully
        // loaded.
        self._count = 0;

        self.fetch = function (opts) {
            var self = this;

            if (!opts.item)
                throw "missing item to fetch";

            queue.add(opts);
            self._count++;
        };

        self.start = function () {
            queue.start();
        };

        var queue = new QueueManager({ delay: -1, batch: batch });

        queue.each(function (opts) {
            // Handle the batching done by QueueManager
            if (!_.isArray(opts)) opts = [opts];

            opts.forEach(function (opt) {
                var item = opt.item;
                var cbItemDone = opt.itemDone;

                item.fetch({
                        success: function () {
                            // When the item is done, call the itemDone callback
                            if (cbItemDone)
                                cbItemDone(self, item);

                            self._count--;

                            if (self._count == 0 && cbQueueDone)
                                cbQueueDone(self);

                            queue.next();
                        },

                        error: function () {

                        }
                    }
                );
            });
        });

        return self;
    };
});