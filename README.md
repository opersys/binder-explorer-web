# Binder Explorer

## Requirements

To try the Binder Explorer, you need the following a working install of
Node.js 0.10 (0.12 has NOT been tested). I still use Node.js v0.10.33
for development but all later version of Node.js in the 0.10 serie should
work. We have yet to test Node v0.12 for development.

The instructions on how to build from sources are available here:

https://github.com/joyent/node/wiki/Installation

It is recommended to build Node.js from source to follow those instructions
because the distribution packages vary in quality and level of integration
with the system. The Node.js source based distribution  has a behavior that
we suppose is uniform accross systems. If you know Node.js and know how to
use your distribution binary packages, they are likely to work if they are
in the 0.10 series but the rest of thos instructions might not apply
very well to you.

`Note that does not cross-compile Node.js to run on Android. This is just
a standard binary Node.js distribution used to run the development tools`

## Running Binder Explorer

Extract the source via Git:

> git clone https://github.com/opersys/binder-explorer-web.git

In the `binder-explorer-web` directory that was just created, use the following command to install all the Node.js packages needed by the project:

> npm install

Also, make sure grunt is installed globally:

> npm install -g grunt

This should enable you to use the `grunt` command. Grunt is a build tool that is commonly used to build, prepare and deploy Node.js projects.

While still in the directory, assemble the project distribution by simply typing Grunt:

> grunt

If the build was successful, you will have 2 directory, one called `dist_ia32` and
one called `dist_arm`, for the 2 architectures we are supporting so far. `We plan to support 64 bit ARM and 64 bit Intel.`

Push `dist_ia32` or `dist_arm` to your target device, depending on the architecture.

> adb push dist_ia32 /data/local/tmp

You can use `/data/local/tmp` or any other directory of your choice. Note that Binder Explorer needs root access to obtain Binder relationships information. This means that it is better suited for development device or emulators than for plain Android devices.

On the device (`adb shell`), go into the `/data/local/tmp` directory and run

> ./node app.js

### Application icons

Right now, the icons are fetched through the Process Explorer background service. If you want icons, have Process Explorer running on the target device before executing Binder Explorer

See: https://play.google.com/store/apps/details?id=com.opersys.processexplorer
