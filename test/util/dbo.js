const recurse = (obj, ctx, path = []) => {
  const convert = (prop, sql) => {
    // TODO: add error handling using the prop
    const { db } = ctx.system
    return {
      sql,
      one: async params => {
        const { rows } = await db.query(sql, params)
        return rows.length > 0 ? rows[0] : null
      },
      many: async params => (await db.query(sql, params)).rows,
      raw: params => db.query(sql, params),
      // used for testing
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

const transform = (sqljs, ctx) => {
  recurse(sqljs, ctx)
}

module.exports = { transform }
