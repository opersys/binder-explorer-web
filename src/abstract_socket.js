
var net = require('net');
var util = require('util');
//var binding = require('bindings')('abstract_socket.node');
var binding = require("./abstract_socket.node");

var socket  = binding.socket;
var bind    = binding.bind;
var connect = binding.connect;
var close   = binding.close;


function errnoException(errorno, syscall) {
    // TODO: having the errno message here would be nice
    var e = new Error(syscall + ' ' + errorno);
    e.errno = e.code = errorno;
    e.syscall = syscall;
    return e;
}


function AbstractSocketServer(connectionListener) {
    net.Server.call(this, connectionListener);
}
util.inherits(AbstractSocketServer, net.Server);


AbstractSocketServer.prototype.listen = function(name, listeningListener) {
    var err = socket();
    if (err < 0)
        throw errnoException(err, 'socket');

    var handle = {fd: err};

    err = bind(err, name);
    if (err < 0) {
        close(handle.fd);
        throw errnoException(err, 'bind');
    }

    net.Server.prototype.listen.call(this, handle, listeningListener);
};


exports.createServer = function(connectionListener) {
    return new AbstractSocketServer(connectionListener);
};


exports.connect = function(name, connectListener) {
    var err = socket();
    if (err < 0)
        throw errnoException(err, 'socket');

    var options = {fd: err, readable: true, writable: true};

    // yes, connect is synchronous, so sue me
    err = connect(err, name);
    if (err < 0) {
        close(options.fd);
        throw errnoException(err, 'connect');
    }

    return new net.Socket(options);
};

exports.createConnection = exports.connect;

