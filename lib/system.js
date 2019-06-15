const util = require('util')
const { EventEmitter } = require('events')

const { scanner } = require('./scanner')

const scan = scanner()

class System {
  constructor() {
    this.providers = {}
    this.registry = {}
  }
  provide(priority, key, provider) {
    const level = (this.providers[priority] = this.providers[priority] || [])
    level.push({ key, provider })
    return this
  }
  scan(priority, keyOrExt, ext) {
    const level = (this.registry[priority] = this.registry[priority] || [])
    level.push({ key: keyOrExt, ext: ext || keyOrExt })
    return this
  }
  async init() {
    // scan for the object hierarchies, then register them as providers
    Object.keys(this.registry)
      .sort()
      .forEach(priority => {
        this.registry[priority].forEach(({ key, ext }) => {
          const provider = scan.recurse(ext, this)
          this.provide(priority, key, () => provider)
        })
      })

    //now iterate each level / stage / whatever, resolve promises, and we're done
    const priorities = Object.keys(this.providers)
    for (let i = 0; i < priorities.length; i++) {
      const idx = priorities[i]
      const targets = this.providers[idx].map(async e => {
        const resolved = await e.provider()
        return { key: e.key, resolved }
      })
      ;(await Promise.all(targets)).forEach(({ key, resolved }) => {
        const existing = this[key]
        if (existing) {
          throw new Error(`Multiple root objects on ${key}`, {
            existing,
            resolved
          })
        }
        this[key] = resolved
      })
    }

    this.emit('ready')
  }
}
util.inherits(System, EventEmitter)

const system = new System()
module.exports = { system }
