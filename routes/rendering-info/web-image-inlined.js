const path = require("path");
const Wreck = require("wreck");
const Joi = require("joi");

const viewsDir = path.join(__dirname, "/../../views/");
const stylesDir = path.join(__dirname, "/../../styles/");

const imageHelpers = require("../../helpers/images.js");

// setup nunjucks environment
const nunjucks = require("nunjucks");
const nunjucksEnv = new nunjucks.Environment();

const styleHashMap = require(`${stylesDir}/hashMap.json`);

const getExactPixelWidth = require("../../helpers/toolRuntimeConfig.js")
  .getExactPixelWidth;

const getScript = require("../../helpers/renderingInfoScript.js").getScript;

module.exports = {
  method: "POST",
  path: "/rendering-info/web-image-inlined",
  options: {
    validate: {
      options: {
        allowUnknown: true
      },
      payload: {
        item: Joi.object(),
        toolRuntimeConfig: Joi.object().keys({
          size: Joi.object().keys({
            width: Joi.array()
              .items(
                Joi.object().keys({
                  value: Joi.number().required(),
                  comparison: Joi.valid("="),
                  unit: Joi.string().optional()
                })
              )
              .max(1)
          })
        })
      }
    }
  },
  handler: async function(request, h) {
    const item = request.payload.item;
    const width = request.payload.toolRuntimeConfig.size.width[0].value;

    const context = {
      item: item,
      displayOptions: request.payload.toolRuntimeConfig.displayOptions || {},
      id: `q_infographic_${request.query._id}_${Math.floor(
        Math.random() * 100000
      )}`.replace(/-/g, "")
    };

    const imageServiceUrl = process.env.IMAGE_SERVICE_URL;
    const images = imageHelpers.getImagesForWidth(item.images.variants, width);

    // fetch the image via imageService in the correct width with assumed dpr of 2 for the screenshot
    const imagesBase64StringPromises = images.map(image => {
      const imageUrl = imageHelpers.getImageUrlForWidthAndFormat(
        image,
        width * 2,
        "png"
      );
      return Wreck.get(imageUrl)
        .then(response => {
          return response.payload.toString("base64");
        })
        .catch(err => {
          return undefined;
        });
    });

    const imageBase64Strings = await Promise.all(imagesBase64StringPromises);

    for (const i in imageBase64Strings) {
      images[i].base64String = imageBase64Strings[i];
    }

    const renderingInfo = {};

    // load imagesMarkup with base64 inlined images
    context.imagesMarkup = nunjucksEnv.render(
      viewsDir + "images-inlined.html",
      {
        images: images
      }
    );

    renderingInfo.markup = nunjucksEnv.render(
      viewsDir + "infographic.html",
      context
    );

    renderingInfo.stylesheets = [
      {
        name: styleHashMap["images"]
      }
    ];

    return renderingInfo;
  }
};
