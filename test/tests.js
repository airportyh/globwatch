var globwatch = require('../globwatch.js')
var exec = require('child_process').exec
var expect = require('chai').expect

describe('globwatch', function(){
    var w
    beforeEach(function(done){
        w = globwatch()
        // adding this delay increases the reliability of the tests
        // don't ask me why
        setTimeout(done, 1)
    })
    it('should watch a file', function(done){
        w.add('one.txt')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('touch one.txt', function(){
                expect(changedFilename).to.equal('one.txt')
                done()
            })
        })
        
    })
    it('should watch a glob of files', function(done){
        w.add('*.txt')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('touch two.txt', function(){
                expect(changedFilename).to.equal('two.txt')
                done()
            })
        })
    })
    it('should watch a file in a dir', function(done){
        w.add('a_dir/three.txt')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('touch a_dir/three.txt', function(){
                expect(changedFilename).to.equal('a_dir/three.txt')
                done()
            })
        })
    })
    it('should watch a dir', function(done){
        w.add('a_dir')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('touch a_dir/four.txt', function(){
                process.nextTick(function(){
                    exec('rm a_dir/four.txt', done)
                })
                expect(changedFilename).to.equal('a_dir')    
            })
        })
    })
    it('should watch a glob that goes into a dir', function(done){
        w.add('a_dir/*.txt')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('touch a_dir/three.txt', function(){
                expect(changedFilename).to.equal('a_dir/three.txt')
                done()
            })
        })
    })
    xit('should watch for new files in the dir if watching a glob in the dir', function(done){
        w.add('a_dir/*.txt')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('touch a_dir/four.txt', function(){
                process.nextTick(function(){
                    exec('rm a_dir/four.txt', done)
                })
                expect(changedFilename).to.equal('a_dir/four.txt')
            })
        })
    })
    xit('should watch wildcard directories', function(done){
        w.add('a_dir/*/*.txt')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('mkdir a_dir/a_dir_too', function(){
                exec('touch a_dir/a_dir_too/six.txt', function(){
                    expect(changedFilename).to.equal('a_dir/a_dir_too/six.txt')
                    done()
                })
            })
        })
    })

    describe('prefix', function(){
        it('should give nothing if no prefix', function(){
            expect(w.prefix('*.txt')).to.equal('.')
        })
        it('should give prefix', function(){
            expect(w.prefix('a_dir/*.txt')).to.equal('a_dir')
        })
    })
})