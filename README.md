To try the Binder Explorer, you need the following a working install of
Node.js 0.10 (0.12 has NOT been tested). I still use Node.js v0.10.33
for development but all later version of Node.js in the 0.10 serie should
work. We have yet to test Node v0.12 for development.

The instructions on how to build from sources are available here:

https://github.com/joyent/node/wiki/Installation

It is recommended to build Node.js from source to follow those instructions
because the distribution packages vary in quality and level of integration
with the system. The Node.js distribution based has a behavior that we
suppose is uniform accross systems. If you are used to them, you are free
to use the binary packages provided with your distribution but the
instructions that follow might now apply to you.

Note that does not cross-compile Node.js to run on Android. This is just
a standard binary Node.js distribution used to run the development tools

Extract the source via Git:

git clone https://github.com/opersys/binder-explorer-web.git

In the directory, use the following command to install all the Node.js packages
needed by the project:

npm install

Make sure grunt is installed globally

npm install -g grunt

Grunt is a build tool that is commonly used to build, prepare and deploy Node.js
projects.

Assemble the project distribution by simply typing Grunt:

grunt

If the build was successful, you will have 2 directory, one called dist_ia32 and
one called dist_arm, for the 2 architectures we are supporting so far.

Push dist_ia32 or dist_arm to your target device, depending on the architecture.

adb push dist_ia32 /data/local/tmp

You can use /data/local/tmp or any other directory of your choice but
/data/local/tmp. Binder Explorer needs root access to obtain Binder relationships
information.

On the device (adb shell), go into the /data/local/tmp directory and run

./node app.js

* Application icons

If you want icons, have Process Explorer running on the target device before
executing Binder Explorer

See: https://play.google.com/store/apps/details?id=com.opersys.processexplorer