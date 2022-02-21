const Lab = require("@hapi/lab");
const Code = require("@hapi/code");
const Hapi = require("@hapi/hapi");
const lab = (exports.lab = Lab.script());
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const expect = Code.expect;
const before = lab.before;
const after = lab.after;
const it = lab.it;

const amphtmlValidator = require("amphtml-validator");
const atob = require("atob");
const imageType = require("image-type");

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

function getElement(markup, selector) {
  return new Promise((resolve, reject) => {
    const dom = new JSDOM(markup);
    resolve(dom.window.document.querySelector(selector));
  });
}

function getElements(markup, selector) {
  return new Promise((resolve, reject) => {
    const dom = new JSDOM(markup);
    resolve(dom.window.document.querySelectorAll(selector));
  });
}

function elementCount(markup, selector) {
  return new Promise((resolve, reject) => {
    const dom = new JSDOM(markup);
    resolve(dom.window.document.querySelectorAll(selector).length);
  });
}

lab.experiment("Q infographic dom tests", () => {
  it("should display title", async () => {
    const response = await server.inject({
      url: "/rendering-info/web?_id=someid",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {},
      },
    });

    return elementCount(response.result.markup, "h3.s-q-item__title").then(
      (value) => {
        expect(value).to.be.equal(1);
      }
    );
  });

  it("should display container", async () => {
    const response = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {},
      },
    });

    return elementCount(
      response.result.markup,
      ".q-infographic-images-container"
    ).then((value) => {
      expect(value).to.be.equal(1);
    });
  });

  it("should display the alt tag of image", async () => {
    const item = require("../resources/fixtures/data/show-alt-tag.json");
    const response = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: item,
        toolRuntimeConfig: {
          size: { width: [{ value: 400, comparison: "=" }] },
        },
      },
    });
    return getElements(response.result.markup, "img").then((elements) => {
      const altTag = `${item.title} - ${item.subtitle}`;
      elements.forEach((element) => {
        expect(element.alt).to.be.equals(altTag);
      });
    });
  });

  it("should only display the title in alt tag of image", async () => {
    const item = require("../resources/fixtures/data/hide-alt-tag.json");
    const response = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: item,
        toolRuntimeConfig: {
          size: { width: [{ value: 400, comparison: "=" }] },
        },
      },
    });

    return getElements(response.result.markup, "img").then((elements) => {
      const altTag = `${item.title}`;
      elements.forEach((element) => {
        expect(element.alt).to.be.equals(altTag);
      });
    });
  });

  it("shouldn't display the alt tag of image", async () => {
    const response = await server.inject({
      url: "/rendering-info/web",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/hide-alt-tag.json"),
        toolRuntimeConfig: {
          displayOptions: {
            hideTitle: true,
          },
          size: { width: [{ value: 400, comparison: "=" }] },
        },
      },
    });

    return getElements(response.result.markup, "img").then((elements) => {
      elements.forEach((element) => {
        expect(element.alt).to.be.equals(""); // alt tag is by default ""
      });
    });
  });
});

lab.experiment("correct image selection based on width", () => {
  it("should show the larger image if width is more than 400px", async () => {
    const response = await server.inject({
      url: "/rendering-info/web?_id=someid",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {
          size: { width: [{ value: 400, comparison: "=" }] },
        },
      },
    });

    const sourceElement = await getElement(
      response.result.markup,
      "picture source"
    );
    return expect(
      sourceElement.getAttribute("srcset").includes("800x500.png")
    ).to.be.true();
  });

  it("should show the smaller images if width is less than 400px", async () => {
    const response = await server.inject({
      url: "/rendering-info/web?_id=someid",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {
          size: { width: [{ value: 399, comparison: "=" }] },
        },
      },
    });

    const sourceElements = await getElements(
      response.result.markup,
      "picture source"
    );
    expect(
      sourceElements[0].getAttribute("srcset").includes("300x200.png")
    ).to.be.true();

    const pictureElements = await getElements(
      response.result.markup,
      "picture"
    );

    expect(pictureElements.length).to.be.equal(2);
  });

  it("should show all the variants if now minWidth is defined in the variants", async () => {
    const response = await server.inject({
      url: "/rendering-info/web?_id=someid",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants-no-min-width.json"),
        toolRuntimeConfig: {
          size: { width: [{ value: 399, comparison: "=" }] },
        },
      },
    });

    const pictureElements = await getElements(
      response.result.markup,
      "picture"
    );

    expect(pictureElements.length).to.be.equal(3);
  });
});

lab.experiment("AMP", { timeout: 10000 }, () => {
  it("should produce valid amp-html", async () => {
    const response = await server.inject({
      url: "/rendering-info/amp",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {},
      },
    });

    const validator = await amphtmlValidator.getInstance();

    const ampDoc = `
    <!doctype html>
    <html amp lang="en">
      <head>
        <meta charset="utf-8">
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <title>Hello, AMPs</title>
        <link rel="canonical" href="http://example.ampproject.org/article-metadata.html">
        <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
        <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
      </head>
      <body>
        ${response.result.markup}
      </body>
    </html>
  `;

    const result = validator.validateString(ampDoc);

    expect(result.status).to.be.equal("PASS");
  });
});

lab.experiment("images-inlined", () => {
  it("should correctly put the image as base64 encoded string into the markup", async () => {
    const response = await server.inject({
      url: "/rendering-info/web-image-inlined",
      method: "POST",
      payload: {
        item: require("../resources/fixtures/data/2-variants.json"),
        toolRuntimeConfig: {
          size: { width: [{ value: 400, comparison: "=" }] },
        },
      },
    });

    const imageElement = await getElement(response.result.markup, "img");
    const srcAttrParts = imageElement.getAttribute("src").split(",");

    expect(srcAttrParts[0]).to.be.equal("data:image/png;base64");
    const imageString = atob(srcAttrParts[1]);
    expect(imageString).to.startWith("PNG");
  });
});
