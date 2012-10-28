var EventEmitter = require('events').EventEmitter.prototype
var fs = require('fs')
var minimatch = require('minimatch')
var path = require('path')
var async = require('async')

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
    this.globPatterns = {}
}

GW.isGlob = function(thing){
    return thing.indexOf('*') !== -1
}

GW.add = function(thing){
    if (this.globPatterns[thing]) return
    this.globPatterns[thing] = true
    if (this.isGlob(thing)){
        this.addGlob(thing)
    }else{
        this.addFile(thing)
    }
}

GW.prefix = function(pattern){
    var idx = pattern.indexOf('/')
    return idx === -1 ? '.' : pattern.substring(0, idx)
}

GW.scanGlob = function(pattern, callback){
    var watched = []
    this._scanGlob(this.globParts(pattern), pattern, watched, function(){
        callback(null, watched)
    })
}

GW._scanGlob = function(globParts, pattern, watched, callback){
    var self = this
    var dir = globParts[0]
    if (minimatch(dir, pattern)){
        if (watched.indexOf(dir) === -1) watched.push(dir)
    }
    if (globParts.length === 1){ // if only one left
        callback(null, watched)
        return
    }
    fs.readdir(dir, function(err, files){
        if (err){
            callback(null, watched)
            return
        }
        if (watched.indexOf(dir) === -1) watched.push(dir)
        var subpaths = files.map(function(file){
            return path.join(dir, file)
        })
        async.forEach(subpaths, function(subpath, done){
            var gp = [subpath].concat(globParts.slice(2))
            self._scanGlob(gp, pattern, watched, done)
        }, function(err){
            callback(null, watched)
        })
    })
}

GW.scanDir = function(dir, options, callback){
    if (typeof options === 'function'){
        callback = options
        options = {}
    }
    var self = this
    fs.readdir(dir, function(err, files){
        files.forEach(function(filename){
            filename = path.join(dir, filename)
            if (self.matches(filename)){
                if (options.fireChange){
                    self.emit('change', filename)
                }
                self.add(filename)
            }
        })
        if (callback) callback(err, files)
    })
}

GW.isWildCard = function(pattern){
    return pattern.indexOf('*') !== -1
}

GW.globParts = function(pattern){
    var parts = pattern.split('/')
    var retval = []
    var i = 0
    var curr = []
    while (i < parts.length){
        var part = parts[i]
        if (part === '*' || part === '**'){
            retval.push(curr.join('/'))
            retval.push(part)
            curr = []
        }else{
            curr.push(part)
        }
        i++
    }
    retval.push(curr.join('/'))
    return retval
}

GW.addGlob = function(pattern){
    var self = this
    this.pushTask()
    this.scanGlob(pattern, function(err, towatch){
        console.log(towatch)
        towatch.forEach(function(file){
            self.addFile(file)
        })
    })
}

GW.addFile = function(filename){
    var self = this
    if (this.watchedFiles[filename]) return
    this.pushTask()
    this.emit('addfile', filename)
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

GW.matches = function(filename){
    for (var pattern in this.globPatterns){
        if (minimatch(filename, pattern))
            return true 
    }
    return false
}

GW.onFileAccessed = function(filename){
    var self = this
    if (this.matches(filename)){
        this.emit('change', filename)
    }else{

        fs.stat(filename, function(err, stat){
            if (stat.isDirectory()){
                self.scanDir(filename, {fireChange: true})
            }
        })
    }
}

GW.clear = function(){
    this.globPatterns = {}
    for (var file in this.watchedFiles){
        var watcher = this.watchedFiles[file]
        watcher.close()
    }
    this.pendingTasks = 0
}

module.exports = function globwatch(){
    var gw = clone(GW)
    gw.initialize()
    return gw
}