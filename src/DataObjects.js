const assert = require("assert");
const debug = require("debug")("parse");

class Ref {
    constructor(refId) {
        assert(Number.isInteger(refId), `Invalid refId value ${refId}`);
        this._id = refId;
    }

    get id() { return this._id; }

    set node(nodeId) {
        assert(Number.isInteger(nodeId), `Invalid nodeId value ${nodeId}`);
        this._node = nodeId;
    }

    get node() { return this._node; }

    set dead(dead) {
        assert(typeof(dead) == "boolean", `Invalid dead value ${dead}`);
        this._dead = dead;
    }

    get dead() { return this._dead; }

    // Significance of 'desc', 's' and 'w' values are unknown for me
    // as this time.

    set desc(desc) {
        assert(Number.isInteger(desc), `Invalid desc value ${desc}`);
        this._desc = desc;
    }

    get desc() { return this._desc; }

    set s(s) {
        assert(Number.isInteger(s), `Invalid s value ${s}`);
        this._s = s;
    }

    get s() { return this._s; }

    set w(w) {
        assert(Number.isInteger(w), `Invalid w value ${w}`);
        this._w = w;
    }

    get w() { return this._w; }
}

class Thread {
    constructor(threadId) {
        this._threadId = threadId;
    }

    // Significance of those values are unknown.

    set desc(desc) {
        assert(Number.isInteger(desc), `Invalid desc value ${desc}`);
        this._desc = desc;
    }

    get desc() { return this._desc; }

    set l(l) {
        assert(Number.isInteger(l), `Invalid l value ${l}`);
        this._l = l;
    }

    get l() { return this._l; }

    set need_return(nr) {
        assert(Number.isInteger(nr), `Invalid need_return value ${nr}`);
        this._need_return = nr;
    }

    get need_return() { return this._need_return; }

    set tr(tr) {
        assert(Number.isInteger(tr), `Invalid tr value ${tr}`);
        this._tr = tr;
    }

    get tr() { return this._tr; }
}

class Node {
    constructor(nodeId) {
        assert(Number.isInteger(nodeId), `Invalid nodeId value ${nodeId}`);
        this._nodeId = nodeId;
        this._procs = new Set();
    }

    set pri(pri) {
        this._pri = pri;
    }

    get pri() { return this._pri; }

    set hs(hs) {
        assert(Number.isInteger(hs), `Invalid hs value ${hs}`);
        this._hs = hs;
    }

    get hs() { return this._hs; }

    set hw(hw) {
        assert(Number.isInteger(hw), `Invalid hw value ${hw}`);
        this._hw = hw;
    }

    get hw() { return this._hw; }

    set ls(ls) {
        assert(Number.isInteger(ls), `Invalid ls value ${ls}`);
        this._ls = ls;
    }

    get ls() { return this._ls; }

    set lw(lw) {
        assert(Number.isInteger(lw), `Invalid lw value ${lw}`);
        this._lw = lw;
    }

    get lw() { return this._lw; }

    set is(is) {
        assert(Number.isInteger(is), `Invalid is value ${is}`);
        this._is = is;
    }

    get is() { return this._is; }

    set iw(iw) {
        assert(Number.isInteger(iw), `Invalid iw value ${iw}`);
        this._iw = iw;
    }

    set tr(tr) {
        assert(Number.isInteger(tr), `Invalid tr value ${tr}`);
        this._tr = tr;
    }

    get tr() { return this._tr; }

    addPid(pid) {
        assert(Number.isInteger(pid), `Invalid pid value ${pid}`);
        this._procs.add(pid);
    }
}

class Context {
    constructor(binder, process, name) {
        this._name = name;
        this._threads = new Map();
        this._refs = new Map();
        this._nodes = new Map();

        this._binder = binder;
        this._process = process;
    }

    get name() {
        return this._name;
    }

    addThread(threadId) {
        let thread = new Thread(threadId);
        assert(!this._threads.has(threadId), `Invalid threadId value ${threadId}`);
        this._threads.set(threadId, thread);
        return thread;
    }

    addRef(refId) {
        let ref = new Ref(refId);
        assert(!this._refs.has(refId));
        this._refs.set(refId, ref);
        return ref;
    }

    getRefs() { return Array.from(this._refs.values()); }

    /**
     * Return an iterator to the Ref object set in this process.
     */
    get refs() { return this._refs.values(); }

    addNode(nodeId) {
        let node = new Node(nodeId);
        assert(!this._nodes.has(nodeId), `Node ${nodeId} already exists`);
        this._nodes.set(nodeId, node);

        // Add the process in the root.
        this._binder.setNodeProcess(nodeId, this._process);

        return node;
    }
}

class Process {
    constructor(binder, pid) {
        this._contexts = new Map();
        this._pid = pid;
        this._binder = binder;
    }

    _assertCtxName(ctxName) {
        assert(ctxName == "binder"
               || ctxName == "hwbinder"
               || ctxName == "vndbinder",
              `Invalid context ${ctxName}`);
    }

    addContext(ctxName) {
        debug(`Process ${this.pid}, adding context ${ctxName}`);

        this._assertCtxName(ctxName);
        let context = new Context(this._binder, this, ctxName);
        assert(!this._contexts.has(ctxName), `Context ${ctxName} already exists`);
        this._contexts.set(ctxName, context);
        return context;
    }

    getContext(ctxName) {
        this._assertCtxName(ctxName);
        return this._contexts.get(ctxName);
    }

    hasContext(ctxName) {
        this._assertCtxName(ctxName);
        return this._contexts.has(ctxName);
    }

    get pid() {
        return this._pid;
    }
}

class Binder {
    constructor() {
        this._processes = new Map();
        this._nodes = new Map();
    }

    setNodeProcess(nodeId, proc) {
        debug(`Node ${nodeId} == Process ${proc.pid}`);

        assert(Number.isInteger(nodeId), `Invalid nodeId value ${nodeId}`);
        this._nodes.set(nodeId, proc);
    }

    getProcessByNode(nodeId) {
        assert(Number.isInteger(nodeId), `Invalid nodeId value ${nodeId}`);
        return this._nodes.get(nodeId);
    }

    hasProcessByNode(nodeId) {
        assert(Number.isInteger(nodeId), `Invalid nodeId value ${nodeId}`);
        return this._nodes.has(nodeId);
    }

    addProcess(pid) {
        let process;

        assert(Number.isInteger(pid), `Invalid pid value ${pid}`);

        if (!this._processes.has(pid)) {
            debug(`Process ${pid}`);
            process = new Process(this, pid);
            this._processes.set(pid, process);
        }
        else process = this._processes.get(pid);

        return process;
    }

    getProcess(pid) {
        assert(Number.isInteger(pid), `Invalid pid value ${pid}`);
        return this._processes.get(pid);
    }

    hasProcess(pid) {
        assert(Number.isInteger(pid), `Invalid pid value ${pid}`);
        return this._processes.has(pid);
    }

    /**
     * Return an iterator on all process objects.
     */
    get processes() {
        return this._processes.values();
    }

    /**
     * Return an iterator on all process IDs
     */
    get pids() {
        return this._processes.keys();
    }
}

module.exports = Binder;
