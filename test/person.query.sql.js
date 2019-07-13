module.exports.selectAll = /* sql */ `
  select * from public.person
`

module.exports.selectOne = /* sql */ `
  select * from public.person where id = :id
`
