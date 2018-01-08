const fs = require('fs')
const Lab = require('lab')
const Code = require('code')
const Hapi = require('hapi')
const lab = exports.lab = Lab.script()

const expect = Code.expect
const before = lab.before
const after = lab.after
const it = lab.it

const routes = require('../routes/routes.js')

let server

before(async () => {
  try {
    server = Hapi.server({
      port: process.env.PORT || 3000,
      routes: {
        cors: true
      }
    })
    await server.register(require('inert'))
    server.route(routes)
  } catch (err) {
    expect(err).to.not.exist()
  }
})

after(async () => {
  await server.stop({ timeout: 2000 })
  server = null
})

lab.experiment('basics', () => {
  it('starts the server', () => {
    expect(server.info.created).to.be.a.number()
  })

  it('is healthy', async () => {
    const response = await server.inject('/health')
    expect(response.payload).to.equal('ok')
  })
})

lab.experiment('rendering-info', () => {
  it('renderes markup', async () => {
    const fixture = fs.readFileSync(`${__dirname}/../resources/fixtures/data/basic.json`, { encoding: 'utf-8' })
    const res = await server.inject({
      url: '/rendering-info/web',
      method: 'POST',
      payload: {
        item: JSON.parse(fixture),
        toolRuntimeConfig: {}
      }
    })
    expect(res.result.markup).to.be.a.string()
  })

  it('returnes compiled stylesheet name', async () => {
    const fixture = fs.readFileSync(`${__dirname}/../resources/fixtures/data/basic.json`, { encoding: 'utf-8' })
    const res = await server.inject({
      url: '/rendering-info/web',
      method: 'POST',
      payload: {
        item: JSON.parse(fixture),
        toolRuntimeConfig: {}
      }
    })
    expect(res.result.stylesheets[0].name).to.be.equal('images.580fff3e.css')
  })
})

lab.experiment('assets', () => {
  it('returnes stylesheet', async () => {
    const fixture = fs.readFileSync(`${__dirname}/../resources/fixtures/data/basic.json`, { encoding: 'utf-8' })
    const res = await server.inject({
      url: '/rendering-info/web',
      method: 'POST',
      payload: {
        item: JSON.parse(fixture),
        toolRuntimeConfig: {}
      }
    })
    const stylesheetRes = await server.inject(`/stylesheet/${res.result.stylesheets[0].name}`)
    expect(stylesheetRes.result).to.be.equal('.q-infographic{opacity:1!important}.q-infographic img{width:100%;display:block}')
  })
})
