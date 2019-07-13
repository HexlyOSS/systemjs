const { System } = require('./system')
const DBO = require('../test/util/dbo')

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
  DBO.hook(system)

  system
    .provide(1, 'db', dbProvider)
    .scan(2, 'dbo', 'sql')
    .scan(1, 'example')
    .scan(3, 'domain', 'fn')

  await system.init()

  let result
  result = await system.dbo.person.query.selectAll.one({ foo: 'bar' })
  console.log({ result })

  try {
    result = await system.dbo.person.query.selectAll.err({ foo: 'bar' })
  } catch (err) {
    console.warn(err)
  }
})
