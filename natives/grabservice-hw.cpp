/*
 * Copyright (C) 2020 Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <android/hidl/manager/1.2/IServiceManager.h>
#include <hidl/ServiceManagement.h>
#include <hidl/HidlTransportUtils.h>

#include <hidl/Status.h>
#include <hidl/MQDescriptor.h>
#include <iostream>

using namespace android;
using namespace android::hidl::manager::V1_0;
using namespace android::hidl::base::V1_0;
using namespace android::hardware;
using namespace std;

/*
 * Return values: 
 * 0: OK after return from signal.
 * 1: Can't get service manager
 * 2: Can't grab service
 */

int main(int argc, char* const argv[])
{
    if (argc < 3) {
        cerr << "Usage: grabservice-hw service_fqdn instance" << endl;
        exit(1);
    }
    
    const sp<IServiceManager> sm = defaultServiceManager();
        
    if (sm == nullptr) {
        cerr << "Unable to get default service manager!" << endl;
        cout << "NO" << endl;
        exit(1);
    }
    
    sp<IBase> service = sm->get(argv[1], argv[2]);

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


