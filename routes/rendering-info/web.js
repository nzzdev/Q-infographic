const path = require("path");
const fs = require("fs");
const Joi = require("joi");
const UglifyJS = require("uglify-js");

const viewsDir = path.join(__dirname, "/../../views/");
const stylesDir = path.join(__dirname, "/../../styles/");

// setup nunjucks environment
const nunjucks = require("nunjucks");
const nunjucksEnv = new nunjucks.Environment();

const styleHashMap = require(`${stylesDir}/hashMap.json`);

const getExactPixelWidth = require("../../helpers/toolRuntimeConfig.js")
  .getExactPixelWidth;

const getScript = require("../../helpers/renderingInfoScript.js").getScript;

const Ajv = require("ajv");
const ajv = new Ajv();

// POSTed item will be validated against given schema
// hence we fetch the JSON schema...
const schemaString = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../resources/", "schema.json"), {
    encoding: "utf-8"
  })
);
const validate = ajv.compile(schemaString);
function validateAgainstSchema(item, options) {
  if (validate(item)) {
    return item;
  } else {
    throw Boom.badRequest(JSON.stringify(validate.errors));
  }
}

async function validatePayload(payload, options, next) {
  if (typeof payload !== "object") {
    return next(Boom.badRequest(), payload);
  }
  if (typeof payload.item !== "object") {
    return next(Boom.badRequest(), payload);
  }
  await validateAgainstSchema(payload.item, options);
}

module.exports = {
  method: "POST",
  path: "/rendering-info/web",
  options: {
    validate: {
      options: {
        allowUnknown: true
      },
      payload: validatePayload
    }
  },
  handler: async function(request, h) {
    const item = request.payload.item;

    const context = {
      item: item,
      displayOptions: {},
      id: `q_infographic_${request.query._id}_${Math.floor(
        Math.random() * 100000
      )}`.replace(/-/g, "")
    };

    if (request.payload.toolRuntimeConfig) {
      context.displayOptions = request.payload.toolRuntimeConfig.displayOptions;
    }

    const renderingInfo = {};

    // if we have the width in toolRuntimeConfig.size
    // we can send the images right away
    const exactPixelWidth = getExactPixelWidth(
      request.payload.toolRuntimeConfig
    );
    if (typeof exactPixelWidth === "number") {
      const imagesResponse = await request.server.inject({
        method: "POST",
        url: `/rendering-info/web-images?width=${exactPixelWidth}`,
        payload: request.payload
      });
      context.imagesMarkup = imagesResponse.result.markup;
    } else {
      // compute some properties for the inline script to be returned that handles requesting the images for the measured width
      const queryParams = {};

      // add the item id to appendItemToPayload if it's state is in the db (aka not preview)
      if (request.payload.itemStateInDb) {
        queryParams.appendItemToPayload = request.query._id;
      }

      let requestMethod;
      let requestBodyString;

      // if we have the current item state in DB, we do a GET request, otherwise POST with the item in the payload
      if (request.payload.itemStateInDb === true) {
        requestMethod = "GET";
        queryParams.appendItemToPayload = request.query._id;
      } else {
        requestMethod = "POST";
        queryParams.noCache = true; // set this if we do not have item state in DB as it will probably change
        requestBodyString = JSON.stringify({
          item: request.payload.item,
          toolRuntimeConfig: request.payload.toolRuntimeConfig
        });
      }

      renderingInfo.scripts = [
        {
          content: UglifyJS.minify(
            getScript(
              context.id,
              request.payload.toolRuntimeConfig.toolBaseUrl,
              requestMethod,
              queryParams,
              requestBodyString
            )
          ).code
        }
      ];
    }

    renderingInfo.stylesheets = [
      {
        name: styleHashMap["images"]
      }
    ];

    renderingInfo.markup = nunjucksEnv.render(
      viewsDir + "infographic.html",
      context
    );

    renderingInfo.loaderConfig = {
      polyfills: ["Promise", "fetch"]
    };

    return renderingInfo;
  }
};
