const Lab = require("@hapi/lab");
const Code = require("@hapi/code");
const Hapi = require("@hapi/hapi");
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
    });
    await server.register(require("@hapi/inert"));
    server.validator(require("joi"));
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

lab.experiment("schema endpoint", () => {
  it("returns 200 for /schema.json", async () => {
    const response = await server.inject("/schema.json");
    expect(response.statusCode).to.be.equal(200);
  });
});

lab.experiment("locales endpoint", () => {
  it("returns 200 for en translations", async () => {
    const request = {
      method: "GET",
      url: "/locales/en/translation.json",
    };
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(200);
  });
  it("returns 200 for fr translations", async () => {
    const request = {
      method: "GET",
      url: "/locales/fr/translation.json",
    };
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(200);
  });
});

lab.experiment("stylesheets endpoint", () => {
  it("returns existing stylesheet with right cache control header", async () => {
    const filename = require("../styles/hashMap.json").images;
    const response = await server.inject(`/stylesheet/${filename}`);
    expect(response.statusCode).to.be.equal(200);
    expect(response.headers["cache-control"]).to.be.equal(
      "max-age=31536000, immutable"
    );
  });

  it("returnes compiled stylesheet name", async () => {
    const response = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {},
      },
    });
    const filename = require("../styles/hashMap.json").images;
    expect(response.result.stylesheets[0].name).to.be.equal(filename);
  });

  it("returns Not Found when requesting an inexisting stylesheet", async () => {
    const response = await server.inject("/stylesheet/inexisting.123.css");
    expect(response.statusCode).to.be.equal(404);
  });
});

lab.experiment("rendering-info endpoint", () => {
  it("returns 200 for /rendering-info/web", async () => {
    const request = {
      method: "POST",
      url: "/rendering-info/web",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {
          displayOptions: {},
        },
      },
    };
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(200);
  });
});

lab.experiment("fixture data endpoint", () => {
  it("returns 5 fixture data items for /fixtures/data", async () => {
    const response = await server.inject("/fixtures/data");
    expect(response.statusCode).to.be.equal(200);
    expect(response.result.length).to.be.equal(5);
  });
});
