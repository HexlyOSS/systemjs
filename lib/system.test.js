const { system } = require('./system')

const dbProvider = system => ({
  query: () => []
})

test('a', async () => {
  const makeDbo = async arg1 => {
    return { stubbed: true }
  }
  system
    .provide(1, 'db', dbProvider)
    .scan(2, 'dbo', 'sql', makeDbo)
    .scan(1, 'example')
    .scan(3, 'domain', 'fn')

  await system.init()
  system.domain.person.parse()
})
