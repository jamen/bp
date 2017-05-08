
const pull = require('pull-stream')
const prompt = require('pull-prompt')
const { read, write } = require('pull-files')
const pixie = require('pixie')
const dot = require('pixie-dot')
const { join } = require('path')
const { empty, map, filter, collect, through, once, asyncMap, onEnd, values, drain } = pull
const pushable = require('pull-pushable')

exports.create = create
exports.scaffold = scaffold

function create (entry, finish) {

  // The boilerplate object
  let bp = { files: null, prompts: null }
  
  // Read configuration and add properties to bp object
  function config (file) {
    const base = file.base
    const path = file.path
    const data = file.data

    if (path === 'boilerplate.json') {
      const config = require(base ? join(base, path) : path)
      Object.assign(bp, config)
      return null
    }
    
    // Delete base to save space in .bp file 
    delete file.base

    return file
  }

  // Prepare the files into templates with pixie
  function preparse (file) {
    file.data = pixie(file.data.toString('utf8'))
    return file
  }

  pull(
    // Read directory
    read(entry + '/**/*'),
    // Find and filter config file
    map(config), filter(),
    // Preparse the files as templates
    map(preparse),
    // Collect template files
    collect((err, files) => {
      if (err) return finish(err)
      
      bp.files = files
      
      // Encode bg object to msgpack
      finish(null, JSON.stringify(bp))
    })
  )
}

function scaffold (bp, dest, finish) {

  var files = pushable()

  function ask (bp) {
    // Prompt the prompts
    var current = null
    pull(
      bp.prompts && bp.prompts.length 
      ? values(bp.prompts)
      : empty(),
      through(prompt => {
        current = prompt.name
      }),
      prompt(),
      map(answer => [current, answer]),
      compile_files(bp.files, files.push)
    )
  }

  // Write files
  pull(
    files, 
    through(file => { 
      console.log('wrote', file.path)
    }),  
    write(dest, finish)
  )

  // Tie everything together
  pull( 
    once(bp),
    map(JSON.parse),
    drain(ask)
  )
}

function compile_files (files, push) {
  var data = {}

  function process () {
    for (var f = files.length; f--;) {
      var file = files[f]
      var expressions = file.data[1]
      var keys = Object.keys(data)
      for (var e = expressions.length; e--;) {
        var expression = expressions[e]
        if (keys.indexOf(expression) === -1) {
          return
        }
      }

      file.data = dot(file.data, data)
      files.splice(files.indexOf(file), 1)
      push(file)
    }
  }

  // Try any files that require no data
  process()
  return drain(([ key, part ]) => {
    // Process each new piece of data
    data[key] = part
    process()
  }, err => {
    if (err) throw err
    // Process on exit
    process()
  })
}

