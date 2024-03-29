# Tested on:

* HiKey 620
* Android 10 for BeagleBone Black 
* Emulator

# How to run this project using prebuilt packages

We've made available 3 prepared packages using the Releases feature of GitHub

x86-64:https://github.com/opersys/binder-explorer-web/releases/download/v0.5/binder-explorer_x86-64.tar.gz

ARM 32 bits: https://github.com/opersys/binder-explorer-web/releases/download/v0.5/binder-explorer_arm.tar.gz

ARM 64 bits: https://github.com/opersys/binder-explorer-web/releases/download/v0.5/binder-explorer_arm64.tar.gz

To use any of those release packages:

- Forward port 3000 to your local computer with *adb*
```
$ adb forward tcp:3000 tcp:3000
```

- Use *adb push* to move the package corresponding to your device architecture to a directory. We generally use */data/local/tmp* for demonstrations
```
$ adb push binder-explorer_x86_64.tar.gz /data/local/tmp
```

- Enter your device *adb* shell:
```
$ adb shell
$ cd /data/local/tmp
```

- Extract the *.tar.gz* file locally
```
$ tar -zxvf binder-explorer_x86_64.tar.gz
```

- Move to the directory that was created following the extraction
```
$ cd dist_x86_64
```

- Use the *run* script in that directory to start Binder Explorer
```
$ ./run
```

# How to build this project

You need a recent version of [Node.js](https://nodejs.org/en/) to build the distributions. There are prebuilt binaries in the *bin* directory which will be copied to the distribution output but besides that, Binder Explorer is a fairly straightforward Node.js project.

Make sure you've got *bower* installed globally:
``` 
$ npm install -g bower
```

- Install the server side packages:
```
$ npm install
```

- Install the client side packages:
```
$ bower install
```

- Assemble the distribution for the target architecture you want (*arm*, *arm64*, *x86_64*):
```
$ grunt dist_x86_64
```

- You can then push the *dist_x86_64* directory, or the directory that corresponds to your architecture, to a directory on your device.
```
$ adb push dist_x86_64 /data/local/tmp
```

# User guide

Connecting to the web interface

If you have correctly forwarded port 3000 from your device to the emulator, you can browser (Firefox or Chrome) to connect to [http://localhost:3000](http://localhost:3000). 

### Mouse functions

* **Left click + drag**: Pan screen
* **Mouse Wheel**: Zoom

If Binder Explorer is working correctly, you will see a screen that looks like the following if you zoom out a bit. You can see that services are grouped together depending if they are regular system services or hardware services. The applications are grouped in the middle and they should dynamically as they get started or stopped.

![Binder Explorer Fullscreen](https://github.com/opersys/binder-explorer-web/blob/master/doc_images/main_screen.png)

## Tooltips

Hovering over an object will show informations about the object

![Tooltip details](https://github.com/opersys/binder-explorer-web/blob/master/doc_images/tooltip_detail.png)

Blue circles around process represents the application-level services that the application has started. Only the service that have a Binder interface are shown that way as local service are invisible to Binder Explorer.

![User service tooltip](https://github.com/opersys/binder-explorer-web/blob/master/doc_images/user_services.png)

## Object dialogs

Clicking on an object will open a dialog box with more details

![Dialog details](https://github.com/opersys/binder-explorer-web/blob/master/doc_images/dialog_detail.png)

The content of the dialog box depends on what object you click. The screenshot above captures what happens when you click on a process. Similar content is available for user services.

# Contributors

* François-Denis Gonthier francois-denis.gonthier@opersys.com -- main developer and maintainer
* Karim Yaghmour karim.yaghmour@opersys.com -- ideas and other forms of entertainment
