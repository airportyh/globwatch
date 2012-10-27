var EventEmitter = require('events').EventEmitter.prototype
var fs = require('fs')
var minimatch = require('minimatch')
var path = require('path')

function augment(obj, properties){
    for (var key in properties){
        obj[key] = properties[key]
    }
}

function clone(obj){
    var retval = {}
    augment(retval, obj)
    return retval
}

var GW = clone(EventEmitter)

GW.initialize = function(){
    this.watchedFiles = {}
    this.pendingTasks = 0
}

GW.add = function(thing){
    if (thing.indexOf('*') !== -1){
        this.addGlob(thing)
    }else{
        this.addFile(thing)
    }
}

GW.prefix = function(pattern){
    var idx = pattern.indexOf('/')
    return idx === -1 ? '.' : pattern.substring(0, idx)
}

GW.addGlob = function(pattern){
    var self = this
    this.pushTask()
    var prefixDir = this.prefix(pattern)
    fs.readdir(prefixDir, function(err, files){
        files.forEach(function(filename){
            filename = path.join(prefixDir, filename)
            if (minimatch(filename, pattern)){
                self.add(filename)
            }
        })
        self.popTask()
    })
    this.addFile(prefixDir)
}

GW.addFile = function(filename){
    var self = this
    if (this.watchedFiles[filename]) return
    this.pushTask()
    this.watchedFiles[filename] = fs.watch(filename, function(){
        self.onFileAccessed(filename)
    })
    this.popTask()
}

GW.pushTask = function(){
    this.pendingTasks++
}

GW.popTask = function(){
    this.pendingTasks--
    this.checkTasks()
}

GW.checkTasks = function(){
    var self = this
    if (this.pendingTasks === 0){
        process.nextTick(function(){
            self.emit('ready')
        })
    }
}

GW.onFileAccessed = function(filename){
    this.emit('change', filename)
}

module.exports = function globwatch(){
    var gw = clone(GW)
    gw.initialize()
    return gw
}