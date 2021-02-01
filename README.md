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

# Contributors

* François-Denis Gonthier francois-denis.gonthier@opersys.com -- main developer and maintainer
* Karim Yaghmour karim.yaghmour@opersys.com -- ideas and other forms of entertainment
