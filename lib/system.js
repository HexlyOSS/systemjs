const _ = require('lodash')
const util = require('util')
const { EventEmitter } = require('events')

const { scanner } = require('./scanner')
const scan = scanner()

class System {
  constructor() {
    this._configurators = [];
    this.providers = {}
    this.registry = {}
  }
  use(configurator){
    this._configurators.push(configurator)
    return this
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

    await Promise.all(this._configurators.map(cfg => cfg(this)))

    // scan for the object hierarchies, then register them as providers
    Object.keys(this.registry)
      .sort()
      .forEach(priority => {
        this.registry[priority].forEach(({ key, ext, provider }) => {

          let result
          if( Array.isArray(ext) ){
            const mapping = ext.reduce( (obj, fext) => {
              obj[fext] = scan.recurse(fext, this)
              return obj
            }, {})

            result = {}

            ext.forEach(type => {
              Object.keys(mapping[type]).forEach(domain => {
                const d = result[domain] = result[domain] || {}
                Object.assign(d, { [type]: mapping[type][domain]})
              })
            })
          }else{
            result = scan.recurse(ext, this)
          }

          if( typeof(provider) == 'function' ){
            provider = provider(result)
          }else if( !!provider ){
            throw new Error(`Provider for '${key}' is not a function (${typeof provider})`)
          }else{
            provider =  (() => result)
          }
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
        const resolved = await e.provider(this)
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

        if( key === '' ){
          for(const rootKey of Object.keys(resolved)){
            if( this[rootKey] ){
              throw new Error(`Multiple root objects on ${rootKey} from root key`, {
                existing: this[rootKey],
                resolved: resolved[rootKey]
              })
            }
            this[rootKey] = resolved[rootKey]
            this.emit('resolution:resolved-root:' + rootKey, {
              system: this,
              waiter,
              resolved: resolved[rootKey],
              stage
            })
          }
          console.log('setting key', key, resolved)
        }else {
          this[key] = resolved
        }

        const nsKey = key ? key : '<root>'
        this.emit('resolution:resolved:' + nsKey, {
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
