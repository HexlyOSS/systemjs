const path = require('path')

const { scanner, recursive } = require('./scanner')
const scan = scanner(path.resolve(__dirname, '../test'))

test('simple', () => {
  const thing = scan('example')
  console.log(thing)
})

test('nested', () => {
  const system = scan.recurse('fn')
  system.person.parse({ id: 5, name: 'bob' })
  system.person.save({ isBob: true })
})
