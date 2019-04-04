const Boom = require("boom");
const Joi = require("joi");
const fs = require("fs");
const path = require("path");

const viewsDir = path.join(__dirname, "/../../views/");

const imageHelpers = require("../../helpers/images.js");

// setup nunjucks environment
const nunjucks = require("nunjucks");
const nunjucksEnv = new nunjucks.Environment();

// POSTed item will be validated against given schema
// hence we fetch the JSON schema...
const schemaString = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../resources/", "schema.json"), {
    encoding: "utf-8"
  })
);
const Ajv = require("ajv");
const ajv = new Ajv();

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
  path: "/rendering-info/web-images",
  options: {
    validate: {
      options: {
        allowUnknown: true
      },
      query: {
        width: Joi.number().required(),
        noCache: Joi.boolean(),
        toolRuntimeConfig: Joi.object().optional()
      },
      payload: validatePayload
    }
  },
  handler: async function(request, h) {
    const item = request.payload.item;

    const images = imageHelpers
      .getImagesForWidth(item.images.variants, request.query.width)
      .map(image => {
        return imageHelpers.getImageWithUrlsForImageAndWidth(
          image,
          request.query.width,
          item.options ? item.options.serveLosslessWebP : false
        );
      });

    const context = {
      item: item,
      images: images,
      displayOptions: {}
    };

    if (request.payload.toolRuntimeConfig) {
      context.displayOptions = request.payload.toolRuntimeConfig.displayOptions;
    }

    let markup;
    try {
      markup = nunjucksEnv.render(viewsDir + "images.html", context);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const renderingInfo = {
      markup: markup
    };

    return renderingInfo;
  }
};
