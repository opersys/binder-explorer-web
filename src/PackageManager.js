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

const rl = require("readline");
const cp = require("child_process");

class PackageManager {

    constructor() {
        let lines, proc = cp.spawnSync("pm", ["list", "packages"]);

        this._packages = [];

        lines = proc.stdout.toString().split(/\n/);
        lines.forEach((line) => {
            this._packages.push(line.split(/:/)[1]);
        });
    }

    /**
     * Call "pm install", throw in case of error.
     */
    install(file) {
        let proc = cp.spawnSync("pm", ["install", file]);

        if (proc.error)
            throw proc.error;
    }

    /**
     * Returns 'true' if a certain package is installed.
     */
    isInstalled(pkg) {
        return this._packages.includes(pkg);
    }
}

module.exports = PackageManager;
