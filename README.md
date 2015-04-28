# Binder Explorer

Go to, https://github.com/opersys/binder-explorer-web/releases, download both *com.opersys.otlauncher.be_0.1.apk* and _otlauncher_. The package include support for both the ARM and 32 bit x86 architectures but be conscious that running Binder Explorer in the ARM emulator will be *very* slow. We will be working on improving Binder Explorer performance later.

## How to try Binder Explorer

Install the .apk package on your device.

<pre>
adb install com.opersys.otlauncher.be_0.1.apk
</pre>

Copy _otlauncher_ somewhere on your device. _/data/local/tmp_ is a good idea.

<pre>
adb push otlauncher /data/local/tmp
</pre>

Make _otlauncher_ executable: 

<pre>
# chmod 0755 ./otlauncher
</pre>

Execute _otlauncher_. Use the _-d_ flag to get more information about the startup.

<pre>
# ./otlauncher
</pre>

# Contributors

* François-Denis Gonthier francois-denis.gonthier@opersys.com -- main developer and maintainer
* Karim Yaghmour karim.yaghmour@opersys.com -- ideas and other forms of entertainment
