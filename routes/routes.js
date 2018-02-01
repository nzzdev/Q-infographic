module.exports = [
  require("./rendering-info/amp.js"),
  require("./rendering-info/web.js"),
  require("./rendering-info/web-image-inlined.js"),
  require("./rendering-info/web-images.js"),
  require("./stylesheet.js"),
  require("./health.js"),
  require("./fixtures/data.js")
].concat(require("./schema.js"));
