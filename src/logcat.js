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

var child_process = require("child_process");
var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = LogCat;

util.inherits(LogCat, EventEmitter);

function LogCat(filter) {
    var self = this;

    EventEmitter.call(this);

    this._filter = filter;
    this._isRunning = false;

    this._logcat = child_process.spawn("logcat", ["-v", "time"]);

    this._logcat.stdout.on("data", function (data) {
        self.onDataReceived.apply(self, [data]);
    });
}

LogCat.prototype.close = function () {
    if (this._isRunning) {
        this._logcat.kill();
        this._logcat = null;
        this._isRunning = false;
    }
};

LogCat.prototype.onClose = function () {
    this.emit("close");
};

LogCat.prototype.onDataReceived = function (data) {
    var lcLines = data.toString().split(/\n/);

    if (!this._isRunning) {
        this._isRunning = true;
        this.emit("start");
    }

    this.emit("data", data.toString());

    for (var lidx in lcLines)
        this.emit("line", lcLines[lidx].trim());
};