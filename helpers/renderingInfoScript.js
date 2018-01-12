const querystring = require("querystring");

function getScript(id, toolBaseUrl, method, queryParams, requestBodyString) {
  const functionName = `loadImages${id}`;
  const dataObject = `${id}Data`;
  return `if (!window.q_domready) {
    window.q_domready = new Promise((resolve) => {
      if (document.readyState && (document.readyState === 'interactive' || document.readyState === 'complete')) {
        resolve();
      } else {
        function onReady() {
          resolve();
          document.removeEventListener('DOMContentLoaded', onReady, true);
        }
        document.addEventListener('DOMContentLoaded', onReady, true);
        document.onreadystatechange = () => {
          if (document.readyState === "interactive") {
            resolve();
          }
        }
      }
    });
  }
  var ${dataObject} = {
    element: document.querySelector("#${id}")
  };
  function ${functionName}() {
    fetch("${toolBaseUrl}/rendering-info/web-images?${querystring.stringify(
    queryParams
  )}&width=" + ${dataObject}.width, {
      method: "${method}",
      ${requestBodyString ? "body: " + JSON.stringify(requestBodyString) : ""}
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(renderingInfo) {
      if (renderingInfo.markup) {
        document.querySelector("#${id} .q-infographic-images-container").innerHTML = renderingInfo.markup;
      }
    });
  }
  window.q_domready.then(function() {
    ${dataObject}.width = ${dataObject}.element.getBoundingClientRect().width;
    ${functionName}();
  });
  window.addEventListener('resize', function() {
    requestAnimationFrame(function() {
      var newWidth = ${dataObject}.element.getBoundingClientRect().width;
      if (newWidth !== ${dataObject}.width) {
        ${dataObject}.width = newWidth;
        ${functionName}();
      }
    });
  });
`;
}

module.exports = {
  getScript: getScript
};
