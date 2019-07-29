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
  scan(priority, keyOrExt, ext, provider) {
    const level = (this.registry[priority] = this.registry[priority] || [])
    level.push({ key: keyOrExt, ext: ext || keyOrExt, provider })
    return this
  }
  async init() {
    // scan for the object hierarchies, then register them as providers
    Object.keys(this.registry)
      .sort()
      .forEach(priority => {
        this.registry[priority].forEach(({ key, ext, provider }) => {
          const target = scan.recurse(ext, this)
          provider = provider || (() => target)
          this.provide(priority, key, provider)
        })
      })

    // collection of waiters for full resolution
    const waiters = []
    const waiter = promise => waiters.push(promise)

    //now iterate each level / stage / whatever, resolve promises, and we're done
    const priorities = Object.keys(this.providers)
    for (let i = 0; i < priorities.length; i++) {
      const stage = priorities[i]
      this.emit(`resolution:stage:${stage}:started`, { system: this, stage })
      const targets = this.providers[stage].map(async e => {
        const resolved = await e.provider()
        return { key: e.key, resolved }
      })
      // console.log('looking at', this.providers[stage])
      ;(await Promise.all(targets)).forEach(({ key, resolved }) => {
        const existing = this[key]
        if (existing) {
          throw new Error(`Multiple root objects on ${key}`, {
            existing,
            resolved
          })
        }
        this[key] = resolved

        this.emit('resolution:resolved:' + key, {
          system: this,
          waiter,
          resolved,
          stage
        })
      })
      this.emit(`resolution:stage:${stage}:resolved`, {
        system: this,
        stage
      })
    }

    this.emit('resolution:complete', { system: this, waiter })

    await Promise.all(waiters)

    this.emit('ready', this)
  }
}
util.inherits(System, EventEmitter)

const system = new System()
module.exports = { system, System }
