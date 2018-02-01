const fs = require("fs");
const Lab = require("lab");
const Code = require("code");
const Hapi = require("hapi");
const lab = (exports.lab = Lab.script());

const expect = Code.expect;
const before = lab.before;
const after = lab.after;
const it = lab.it;

const routes = require("../routes/routes.js");

let server;

before(async () => {
  try {
    server = Hapi.server({
      port: process.env.PORT || 3000,
      routes: {
        cors: true
      }
    });
    await server.register(require("inert"));
    server.route(routes);
  } catch (err) {
    expect(err).to.not.exist();
  }
});

after(async () => {
  await server.stop({ timeout: 2000 });
  server = null;
});

lab.experiment("basics", () => {
  it("starts the server", () => {
    expect(server.info.created).to.be.a.number();
  });

  it("is healthy", async () => {
    const response = await server.inject("/health");
    expect(response.payload).to.equal("ok");
  });
});

lab.experiment("rendering-info", () => {
  it("renderes markup", async () => {
    const fixture = fs.readFileSync(
      `${__dirname}/../resources/fixtures/data/basic.json`,
      { encoding: "utf-8" }
    );
    const res = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: JSON.parse(fixture),
        toolRuntimeConfig: {}
      }
    });
    expect(res.result.markup).to.be.a.string();
  });

  it("returnes compiled stylesheet name", async () => {
    const fixture = fs.readFileSync(
      `${__dirname}/../resources/fixtures/data/basic.json`,
      { encoding: "utf-8" }
    );
    const res = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: JSON.parse(fixture),
        toolRuntimeConfig: {}
      }
    });
    const filename = require("../styles/hashMap.json").images;
    expect(res.result.stylesheets[0].name).to.be.equal(filename);
  });

  it(
    "returns existing stylesheet with right cache control header",
    { plan: 2 },
    async () => {
      const filename = require("../styles/hashMap.json").images;
      const response = await server.inject(`/stylesheet/${filename}`);
      expect(response.statusCode).to.be.equal(200);
      expect(response.headers["cache-control"]).to.be.equal(
        "max-age=31536000, immutable"
      );
    }
  );
});

lab.experiment("assets", () => {
  it("returnes stylesheet", async () => {
    const fixture = fs.readFileSync(
      `${__dirname}/../resources/fixtures/data/basic.json`,
      { encoding: "utf-8" }
    );
    const res = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: JSON.parse(fixture),
        toolRuntimeConfig: {}
      }
    });
    const stylesheetRes = await server.inject(
      `/stylesheet/${res.result.stylesheets[0].name}`
    );
    expect(stylesheetRes.result).to.be.equal(
      ".q-infographic{opacity:1!important}.q-infographic__subtitle{margin-bottom:12px}.q-infographic .picture-container{position:relative;display:block}.q-infographic img{width:100%;display:block;position:absolute;top:0;left:0}"
    );
  });
});
