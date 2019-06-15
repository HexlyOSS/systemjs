const { scanner, recursive } = require('./scanner')
const scan = scanner()

const thing = scan.recurse('fn')
thing.person.parse()
