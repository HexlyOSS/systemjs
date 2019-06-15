const { scanner } = require('./scanner')
const scan = scanner()

test('simple', () => {
  const thing = scan('example')
  console.log(thing)
})

test('nested', () => {
  const system = scan.recurse('fn')
  system.person.parse({ id: 5, name: 'bob' })
  system.person.save({ isBob: true })
})
