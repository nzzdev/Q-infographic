function getMinWidths(variants) {
  return variants.map(variant => {
    return variant.minWidth;
  });
}

function hasDefinedMinWidth(variants) {
  const numberOfDefinedMinWidths = getMinWidths(variants).filter(minWidth => {
    return minWidth !== undefined;
  }).length;
  return numberOfDefinedMinWidths > 0;
}

function getValidMinWidths(variants, width) {
  return getMinWidths(variants).filter(minWidth => {
    return width >= minWidth;
  });
}

function getImagesForWidth(variants, width) {
  // only use the variants that have one or more images
  variants = variants.filter(variant => {
    return variant.images.filter(image => image.url).length > 0;
  });

  // if there is no defined minWidth we return all images
  if (!hasDefinedMinWidth(variants)) {
    return variants.reduce((images, variant) => {
      return images.concat(variant.images);
    }, []);
  }

  // otherwise the ones that are undefined are set to 0
  // as they are valid as long as no defined one is wider than the given width
  variants = variants.map(variant => {
    if (variant.minWidth === undefined) {
      variant.minWidth = 0;
    }
    return variant;
  });

  const validMinWidths = getValidMinWidths(variants, width);

  // our minWidths are exclusive if we have more than one, only the widest valid one wins
  const widestValidMinWidth = validMinWidths.sort((a, b) => {
    return b - a;
  })[0];

  return variants
    .filter(variant => {
      return variant.minWidth === widestValidMinWidth; // variants minWidth needs to be the widest valid one
    })
    .reduce((images, variant) => {
      return images.concat(variant.images);
    }, []);
}

function getImageUrlForWidthAndFormat(image, width, format) {
  return process.env.IMAGE_SERVICE_URL.replace("{key}", image.key)
    .replace("{width}", width)
    .replace("{format}", format);
}

function getImageWithUrlsForImageAndWidth(image, width) {
  return {
    width: image.width,
    height: image.height,
    urls: {
      png1x: getImageUrlForWidthAndFormat(image, width, "png"),
      png2x: getImageUrlForWidthAndFormat(image, width * 2, "png"),
      webp1x: getImageUrlForWidthAndFormat(image, width, "webpll"),
      webp2x: getImageUrlForWidthAndFormat(image, width * 2, "webpll")
    }
  };
}

module.exports = {
  getImagesForWidth: getImagesForWidth,
  getImageWithUrlsForImageAndWidth: getImageWithUrlsForImageAndWidth,
  getImageUrlForWidthAndFormat: getImageUrlForWidthAndFormat
};
