
const pull = require('pull-stream')
const prompt = require('pull-prompt')
const { read, write } = require('pull-files')
const pixie = require('pixie')
const dot = require('pixie-dot')
const path = require('path')
const { empty, map, filter, collect, through, once, asyncMap, onEnd, values, drain } = pull
const pushable = require('pull-pushable')

exports.create = create
exports.scaffold = scaffold

function create (entry, finish) {

  // The boilerplate object
  let bp = { files: null, prompts: null }
  
  // Read configuration and add properties to bp object
  function config (file) {
    if (file.relative === 'boilerplate.json') {
      const config = require(path.join(file.base, file.relative))
      Object.assign(bp, config)
      return null
    }
    
    // Delete the base, we dont need it 
    delete file.base

    return file
  }

  // Prepare the files into templates with pixie
  function preparse (file) {
    file.contents = pixie(file.contents.toString('utf8'))
  }

  pull(
    // Read directory
    read('**/*', entry),
    // Find and filter config file
    map(config), filter(),
    // Preparse the files as templates
    through(preparse),
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
    console.log(bp)
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
      console.log('wrote', file.relative)
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
  var got = false

  return drain(([ key, part ]) => {
    data[key] = part
    if (got === false) got = true

    for (var f = files.length; f--;) {
      var file = files[f]
      var expressions = file.contents[1]
      var keys = Object.keys(data)
      for (var e = expressions.length; e--;) {
        var expression = expressions[e]
        if (keys.indexOf(expression) === -1) {
          return
        }
      }

      file.contents = dot(file.contents, data)
      push(file)
    }
  }, err => {
    if (got === false) {
      for (var i = files.length; i--;) {
        const file = files[i]
        file.contents = dot(file.contents, data)
        push(file)
      }
    }
  })
}

