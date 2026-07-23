function waitForElementWithFunction(elementFunction, timeout, callback) {
  const startTime = Date.now();

  function checkElement() {
    const element = elementFunction();

    if (element) {
      callback(element);
    } else if (Date.now() - startTime < timeout) {
      setTimeout(checkElement, 100);
    } else {
      console.error("Element not found within the specified timeout.");
      callback(undefined);
    }
  }

  checkElement();
}

Element.prototype.appendHTML = function (str) {
  var div = document.createElement("div");

  div.innerHTML = str;
  while (div.children.length > 0) {
    this.appendChild(div.children[0]);
  }
};

function loadImageBg() {
  waitForElementWithFunction(
    () => document.getElementById("page_wrapper"),
    12000,
    (container) => {
      container.appendHTML(
        `<video autoplay loop muted style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: none; object-fit: cover; filter: blur(8px);">
      <source src="/images/background.mp4" type="video/mp4">
        Your browser does not support the video tag.
    </video>`
      );
    }
  );
}

window.onload = () => {
  loadImageBg();
};
