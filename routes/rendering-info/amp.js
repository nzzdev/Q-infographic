const Boom = require("@hapi/boom");
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
    encoding: "utf-8",
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

// we just hardcoded 380 here. generally we will show the images for narrow screens on AMP pages.
const defaultWidth = 380;

module.exports = {
  method: "POST",
  path: "/rendering-info/amp",
  options: {
    validate: {
      options: {
        allowUnknown: true,
      },
      query: {
        noCache: Joi.boolean(),
      },
      payload: validatePayload,
    },
  },
  handler: async function (request, h) {
    const item = request.payload.item;

    const images = imageHelpers
      .getImagesForWidth(item.images.variants, defaultWidth)
      .map((image) => {
        return {
          width: image.width,
          height: image.height,
          urls: {
            w360: imageHelpers.getImageUrlForWidthAndFormat(image, 360, "png"),
            w560: imageHelpers.getImageUrlForWidthAndFormat(image, 560, "png"),
            w800: imageHelpers.getImageUrlForWidthAndFormat(image, 800, "png"),
            w1000: imageHelpers.getImageUrlForWidthAndFormat(
              image,
              1000,
              "png"
            ),
          },
        };
      });

    const context = {
      item: item,
      displayOptions: request.payload.toolRuntimeConfig.displayOptions || {},
      images: images,
    };

    let markup;
    try {
      markup = nunjucksEnv.render(viewsDir + "amp.html", context);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const renderingInfo = {
      markup: markup,
    };

    return renderingInfo;
  },
};
