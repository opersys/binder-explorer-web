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

const cp = require("child_process");

/**
 * Interface with Android 'am' tool.  Currently only the
 * 'start-foreground-service' is implemented
 */
class ActivityManager {

    constructor() {}

    /**
     * Call "am start-foreground-service"
     */
    startForegroundService(serviceId) {
        let proc = cp.spawnSync("am", ["start-foreground-service", serviceId]);

        if (proc.error)
            throw error;
    }

    /* Maybe add some more stuff here someday.... */
}

module.exports = ActivityManager;
