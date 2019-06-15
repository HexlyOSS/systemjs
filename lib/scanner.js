const path = require('path')
const glob = require('glob')

function ScanPath() {}
const scanner = (base = process.cwd()) => {
  const scan = subExt => {
    const pattern = `**/*.${subExt}.js`
    const templates = {}
    const files = glob.sync(`${base}/${pattern}`)

    files.forEach(file => {
      const name = file
        .split(`.${subExt}`)[0]
        .split('/')
        .slice(-1)
      templates[name] = require(file)
    })
    return templates
  }

  scan.recurse = (subExt, ctx) => {
    const scanned = scan(subExt)

    const root = new ScanPath()
    const result = Object.keys(scanned).reduce((obj, k) => {
      const pieces = k.split('.')
      let target = obj
      while (pieces.length) {
        const piece = pieces.shift()
        if (pieces.length) {
          if (target[piece] === undefined) {
            // console.log('creating a new path', { pieces, piece })
            target[piece] = new ScanPath()
          } else if (target[piece] instanceof ScanPath) {
            // console.log('reusing a path', { pieces, piece })
          } else {
            throw new Error(
              'Didnt find a ScanPath - so some sort of collision happened'
            )
          }
          target = target[piece]
        } else {
          // no more pieces? whatever this thing was, it's now the thing
          // console.log('last case', { pieces, piece })
          target[piece] = scanned[k](ctx)
        }
      }

      return obj
    }, root)

    return result
  }

  return scan
}

module.exports = { scanner }