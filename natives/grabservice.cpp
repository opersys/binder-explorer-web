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

#include <iostream>
#include <utils/String16.h>
#include <binder/IServiceManager.h>

#include <sys/types.h>
#include <unistd.h>

using namespace android;
using namespace std;

/*
 * Return values: 
 * 0: OK after return from signal.
 * 1: Can't get service manager
 * 2: Can't grab service
 */

int main(int argc, char* const argv[])
{
    if (argc != 2) {
        fprintf(stderr, "Usage: getservice service_name\n");
        exit(1);
    }
    
    sp<IServiceManager> sm = defaultServiceManager();

    if (sm == nullptr) {
        cerr << "Unable to get default service manager!" << endl;
        cout << "NO" << endl;
        exit(1);
    }
    
    sp<IBinder> service = sm->getService(String16(argv[1]));

    if (service) {
        cerr << "PID " << getpid() << " holding ref to service: " << argv[1] << endl;
        cout << "OK" << endl;
        pause();
    }
    else {
        cerr << "Unable to hold ref to service: " << argv[1] << endl;
        cout << "NO" << endl;
        exit(2);
    }
    
    exit(0);
}
