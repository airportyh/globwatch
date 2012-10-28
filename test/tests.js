var globwatch = require('../globwatch.js')
var exec = require('child_process').exec
var expect = require('chai').expect

describe('globwatch', function(){
    var w
    beforeEach(function(done){
        w = globwatch()
        exec('rm a_dir/four.txt', function(){
            exec('rm -fr a_dir/a_dir_too', function(){
                done()
            })
        })
    })
    afterEach(function(){
        w.clear()
    })
    it('should watch a file', function(done){
        w.add('one.txt')
        w.on('ready', function(){
            exec('touch one.txt', function(){
                expect(changedFilename).to.equal('one.txt')
                done()
            })
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
        })
        
    })
    it.only('should watch a glob of files', function(done){
        w.add('*.txt')
        w.on('ready', function(){
            exec('touch two.txt', function(){
                expect(changedFilename).to.equal('two.txt')
                done()
            })
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
        })
    })
    it('should watch a file in a dir', function(done){
        w.add('a_dir/three.txt')
        w.on('ready', function(){
            exec('touch a_dir/three.txt', function(){
                expect(changedFilename).to.equal('a_dir/three.txt')
                done()
            })
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
        })
    })
    it('should watch a dir', function(done){
        w.add('a_dir')
        w.on('ready', function(){
            exec('touch a_dir/four.txt', function(){
                expect(changedFilename).to.equal('a_dir')
                done()
            })
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
        })
    })
    it('should watch a glob that goes into a dir', function(done){
        w.add('a_dir/*.txt')
        w.on('ready', function(){
            exec('touch a_dir/three.txt', function(){
                expect(changedFilename).to.equal('a_dir/three.txt')
                done()
            })
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
        })
    })
    it('should watch for new files in the dir if watching a glob in the dir', function(done){
        w.add('a_dir/*.txt')
        w.on('ready', function(){
            exec('touch a_dir/four.txt')
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            w.once('addfile', function(filename){
                expect(filename).to.equal('a_dir/four.txt')
                expect(changedFilename).to.equal('a_dir/four.txt')
                done()
            })
        })
    })
    it('should watch for new dirs in the dir if watching glob in the dir', function(done){
        w.add('a_dir/*')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('mkdir a_dir/a_dir_too')
            w.once('addfile', function(filename){
                expect(filename).to.equal('a_dir/a_dir_too')
                expect(changedFilename).to.equal('a_dir/a_dir_too')
                done()
            })
        })
    })
    it('should watch wildcard dir in a dir', function(done){
        w.add('a_dir/*/*.txt')
        w.on('ready', function(){
            var changedFilename = null
            w.on('change', function(filename){
                changedFilename = filename
            })
            exec('mkdir a_dir/a_dir_too')
            w.once('addfile', function(filename){
                console.log('got dir made')
                expect(filename).to.equal('a_dir/a_dir_too')
                done()
                /*
                exec('mkdir a_dir/a_dir_too/six.txt')
                w.once('addfile', function(filename){
                    expect(filename).to.equal('a_dir/a_dir_too/six.txt')
                    done()
                })
                */
            })
        })
    })
    describe.only('scanGlob', function(){
        it('should list files', function(done){
            w.scanGlob('*.txt', function(err, watched){
                expect(watched).to.deep.equal(['one.txt', 'two.txt'])
                done()
            })
        })
        it('should return a dir', function(done){
            w.scanGlob('a_dir', function(err, watched){
                expect(watched).to.deep.equal(['a_dir'])
                done()
            })
        })

        context('has nested dir', function(){
            beforeEach(function(done){
                exec('mkdir a_dir/a_dir_too', function(){
                    done()
                })    
            })
            it('should return nested dir', function(done){
                w.scanGlob('a_dir/a_dir_too', function(err, watched){
                    expect(watched).to.deep.equal(['a_dir/a_dir_too'])
                    done()
                })
            })
            it('should return matched files', function(done){
                w.scanGlob('a_dir/*', function(err, watched){
                    expect(watched).to.deep.equal
                        (['a_dir', 'a_dir/a_dir_too', 'a_dir/three.txt'])
                    done()
                })
            })
            context('has files in nested dir', function(){
                beforeEach(function(done){
                    exec('touch a_dir/a_dir_too/seven.txt', function(){
                        exec('touch a_dir/a_dir_too/eight.txt', function(){
                            done()
                        })
                    })
                })
                it('should return the nested files plus the dirs', function(done){
                    w.scanGlob('a_dir/*/*.txt', function(err, watched){
                        expect(watched).to.deep.equal
                            (['a_dir', 'a_dir/a_dir_too', 'a_dir/a_dir_too/eight.txt', 'a_dir/a_dir_too/seven.txt'])
                        done()
                    })
                })
            })
        })
    })
    describe('globParts', function(){
        it('gives one part', function(){
            expect(w.globParts('*.txt')).to.deep.equal(['*.txt'])
        })
        it('should split by path separator', function(){
            expect(w.globParts('abc/*/def')).to.deep.equal(['abc', '*', 'def'])
        })
        it('should combine the non-wildcard parts', function(){  
            expect(w.globParts('abc/def/*/ghi')).to.deep.equal(['abc/def', '*', 'ghi'])
            expect(w.globParts('abc/*/def/ghi')).to.deep.equal(['abc', '*', 'def/ghi'])
        })
        it('should see super-wildcards', function(){
            expect(w.globParts('abc/**/ghi')).to.deep.equal(['abc', '**', 'ghi'])
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