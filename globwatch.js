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

module.exports = function globwatch(){

    var gw = clone(EventEmitter)

    gw.watchedFiles = {}

    gw.pendingTasks = 0

    gw.add = function(thing){
        if (thing.indexOf('*') !== -1){
            gw.addGlob(thing)
        }else{
            gw.addFile(thing)
        }
    }

    gw.prefix = function(pattern){
        var idx = pattern.indexOf('/')
        return idx === -1 ? '.' : pattern.substring(0, idx)
    }

    gw.addGlob = function(pattern){
        gw.pushTask()
        var prefixDir = gw.prefix(pattern)
        fs.readdir(prefixDir, function(err, files){
            files.forEach(function(filename){
                filename = path.join(prefixDir, filename)
                if (minimatch(filename, pattern)){
                    gw.add(filename)
                }
            })
            gw.popTask()
        })
        gw.addFile(prefixDir)
    }

    gw.addFile = function(filename){
        if (gw.watchedFiles[filename]) return
        gw.pushTask()
        gw.watchedFiles[filename] = fs.watch(filename, function(){
            gw.onFileAccessed(filename)
        })
        gw.popTask()
    }

    gw.pushTask = function(){
        gw.pendingTasks++
    }

    gw.popTask = function(){
        gw.pendingTasks--
        gw.checkTasks()
    }

    gw.checkTasks = function(){
        if (gw.pendingTasks === 0){
            process.nextTick(function(){
                gw.emit('ready')
            })
        }
    }

    gw.onFileAccessed = function(filename){
        gw.emit('change', filename)
    }

    return gw

}