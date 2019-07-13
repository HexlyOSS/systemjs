const { System } = require('./system')

let system
beforeEach(() => {
  system = new System()
})

const dbProvider = system => ({
  query: async () => ({
    rows: [{ query: 1 }]
  }),
  execute: async () => ({
    rows: [{ delete: 2 }]
  })
})

test('simple', async () => {
  system
    .provide(1, 'db', dbProvider)
    .scan(2, 'dbo', 'sql')
    .scan(1, 'example')
    .scan(3, 'domain', 'fn')

  await system.init()
  system.domain.person.parse()
})

// test('waiters', async finished => {
//   // show us that it does run sequentially on notifications
//   const wrapper = (resolve, label) => () => {
//     console.log('Resolving', label)
//     resolve()
//   }
//   system.on('resolution:complete', ({ waiter }) => {
//     console.log('first waiter')
//     waiter(
//       new Promise(resolve => setTimeout(wrapper(resolve, '1'), 0.5 * 1000))
//     )
//   })
//   system.on('resolution:complete', ({ waiter }) => {
//     console.log('2nd waiter')
//     waiter(
//       new Promise(resolve => setTimeout(wrapper(resolve, '2'), 1.5 * 1000))
//     )
//   })
//   system.on('resolution:complete', ({ waiter }) => {
//     console.log('3rd waiter')
//   })

//   system.on('ready', () => {
//     console.log('READY')
//     finished()
//   })

//   system
//     .provide(1, 'db', dbProvider)
//     .scan(2, 'dbo', 'sql')
//     .scan(1, 'example')
//     .scan(3, 'domain', 'fn')

//   await system.init()
// })

test('post processing', async () => {
  // hook into the "dbo" being scanned
  let resolve, reject, dbo
  system.on('resolution:resolved:dbo', ({ waiter, resolved }) => {
    waiter(
      new Promise((res, rej) => {
        resolve = res
        reject = rej
        dbo = resolved
      })
    )
  })

  const recurse = (obj, ctx, path = []) => {
    const convert = (prop, sql) => {
      // TODO: add error handling using the prop
      const { db } = ctx.system
      return {
        one: async params => {
          const { rows } = await db.query(sql, params)
          return rows.length > 0 ? rows[0] : null
        },
        many: async params => (await db.query(sql, params)).rows,
        raw: params => db.query(sql, params),
        err: async params => {
          const joined = path.join('.')
          const msg = `Query [${joined}.${prop}] failed with the following SQL: \n${sql}`
          throw new Error(msg)
        }
      }
    }

    Object.keys(obj).forEach(prop => {
      const value = obj[prop]
      switch (typeof value) {
        case 'object':
          path.push(prop)
          recurse(value, ctx, path)
          break

        case 'string':
          obj[prop] = convert(prop, value)
          break

        default:
          console.log('Ignoring', { prop, value })
          break
      }
    })
  }

  // once the entire system is resolved, convert the sql to functions
  system.on('resolution:complete', system => {
    recurse(dbo, system)
    resolve()
  })

  system
    .provide(1, 'db', dbProvider)
    .scan(2, 'dbo', 'sql')
    .scan(1, 'example')
    .scan(3, 'domain', 'fn')

  await system.init()

  let result
  result = await system.dbo.person.query.selectAll.one({ foo: 'bar' })
  console.log({ result })

  result = await system.dbo.person.query.selectAll.err({ foo: 'bar' })
})
