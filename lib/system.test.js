const { system } = require('./system')

const dbProvider = async () => {
  query: () => []
}

test('a', () => {
  system
    .provide(2, 'db', dbProvider)
    .scan(1, 'dbo', 'sql')
    .scan(2, 'example')
    .scan(3, 'domain', 'fn')

  await system.init()
  system.domain.person.parse()
})
