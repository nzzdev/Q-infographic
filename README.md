# Q-infographic [![Build Status](https://travis-ci.com/nzzdev/Q-infographic.svg?token=tYv1sxPNiVKviBpSHziC&branch=dev)](https://travis-ci.com/nzzdev/Q-infographic) [![Greenkeeper badge](https://badges.greenkeeper.io/nzzdev/Q-infographic.svg?token=d5a9a801229890e88e1a6197e5defa70ddfcf67eed0c2b4c81f24f16ea1489ce&ts=1551342813362)](https://greenkeeper.io/)

**maintainer**: [benib](https://github.com/benib)

Q infographic is one tool of the Q toolbox to display different graphics depending on their container size.
Test it in the [Q Playground](https://q-playground.st.nzz.ch).

## Table of contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Functionality](#functionality)
- [License](#license)

## Installation

```bash
git clone git@github.com:nzzdev/Q-infographic.git
cd ./Q-infographic
nvm use
npm install
npm run build
```

## Configuration

There is one env variable `IMAGE_SERVICE_URL` to be defined. It should contain a URL with 3 parameters that will get replaced before the URL is used to load the images.
`{key}` will be replaced by the string Q-server stored as the key when the file got uploaded through Q-servers `/file` endpoint provided by the [file plugin](https://github.com/nzzdev/Q-server/blob/dev/plugins/file/index.js)
`{width}` is replaced by the width the image should be loaded
`{format}` will be `png` or `webp` (a `picture` element is used in the HTML with multiple `source` elements)
Example: `https://q-images.nzz.ch/{key}?width={width}&format={format}`

If `IMAGE_SERVICE_URL` is not configured, the `image.url` property is used directly to load the image. This is mostly useful for dev and testing with fixture data. On production you most certainly want to use an image service to deliver resized and optimized images to the users.

## Development

Start the Q dev server:

```
npx @nzz/q-cli server
```

Run the Q tool:

```
node index.js
```

[to the top](#table-of-contents)

## Testing

The testing framework used in this repository is [Code](https://github.com/hapijs/code).

Run the tests:

```
npm run test
```

### Implementing a new test

When changing or implementing...

- A `route`, it needs to be tested in the `e2e-tests.js` file
- Something on the frontend, it needs to be tested in the `dom-tests.js` file

[to the top](#table-of-contents)

## Deployment

We provide automatically built docker images at https://hub.docker.com/r/nzzonline/q-infographic/.
There are three options for deployment:

- use the provided images
- build your own docker images
- deploy the service using another technology

### Use the provided docker images

1. Deploy `nzzonline/q-infographic` to a docker environment
2. Set the ENV variables as described in the [configuration section](#configuration)

## Functionality

The tool structure follows the general structure of each Q tool. Further information can be found in [Q server documentation - Developing tools](https://nzzdev.github.io/Q-server/developing-tools.html).

There are 4 endpoints for renderingInfo:

### `/rendering-info/web`

This is the default endpoint called for web targets. It returnes the complete markup including a picture element for the image in case an exact width is given in `toolRuntimeConfig.size.width`. In case the width is missing a script measuring the width after the dom is ready is returned. This script will call `/rendering-info/web-images` with the exact container width passed in the `width` query parameter.

### `/rendering-info/web-images`

There are 2 places where this route is called from.

1. From inside the handler for `rendering-info/web` using server.inject
2. From the client side script returned from `/rendering-info/web` if no exact width is given

This route handler renders the `view/images.html` template and returns a `<picture>` element containing different `<source>` elements for the image in different sizes for different screen DPI and png/webp. Each `<img>` has an `alt`-tag which is defined by the `item.title` and `item.subtitle`. The matrix of how it will be displayed can be found (here)[https://github.com/nzzdev/Q-infographic/blob/c52f4cbf57d3955ad09d8e9c8d0dbd77b40cfdfe/views/images.html#L5].

### `/rendering-info/web-images-inlined`

This endpoint loads the images upfront and injects them in the markup as base64. This is only used for the screenshotting service as loading the images like this doesn't need a script to check if the images are loaded before taking the screenshot.

### `/rendering-info/amp`

This endpoint returns amp-html for the complete graphic including title/subtitle/image/footer. It is to serve the AMP version of nzz.ch currently.

[to the top](#table-of-contents)

### Options

#### serveLosslessWebP

If checked the format for WebP images will be `webpll`. If unchecked `webply`. These formats are recognised by fastly image service (https://docs.fastly.com/api/imageopto/format)

[to the top](#table-of-contents)

## LICENSE

Copyright (c) 2019 Neue Zürcher Zeitung.

This software is licensed under the [MIT](LICENSE) License.
