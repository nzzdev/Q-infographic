const fixtureDataDirectory = "../../resources/fixtures/data";

// provide every fixture data file present in ../../resources/fixtures/data
// has to be in sync with files created in build task - see ../../tasks/build.js
const fixtureData = [
  require(`${fixtureDataDirectory}/2-variants-no-min-width.json`),
  require(`${fixtureDataDirectory}/2-variants.json`),
  require(`${fixtureDataDirectory}/hide-alt-tag.json`),
  require(`${fixtureDataDirectory}/show-alt-tag.json`),
  require(`${fixtureDataDirectory}/show-title-alt-tag.json`)
];

module.exports = {
  path: "/fixtures/data",
  method: "GET",
  options: {
    tags: ["api"],
  },
  handler: (request, h) => {
    return fixtureData;
  }
};
