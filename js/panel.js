const CSGate = new CSInterface();

function loadJSX(fileName) {
  const extensionRoot = CSGate.getSystemPath(SystemPath.EXTENSION) + "/jsx/";
  return new Promise((resolve) => {
    CSGate.evalScript('$.evalFile("' + extensionRoot + fileName + '")', () => {
      resolve();
    });
  });
}

function* enumerate(iterable) {
  let i = 0;
  for (let item of iterable) {
    yield [i++, item];
  }
}

function CSSColorToRGB(color) {
  return /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/
    .exec(color)
    .slice(1, 4)
    .map(Number);
}

function RGBtoCSSColor(color) {
  return `rgb(${color.map(Math.round).join(", ")})`;
}

function getColor() {
  return new Promise((resolve) => {
    CSGate.evalScript("getColor()", (e) => resolve(JSON.parse(e)));
  });
}

function getBGColor() {
  return new Promise((resolve) => {
    CSGate.evalScript("getBGColor()", (e) => resolve(JSON.parse(e)));
  });
}

function setColor(red, green, blue) {
  return new Promise((resolve) => {
    CSGate.evalScript(`setColor(${red}, ${green}, ${blue})`, (e) => resolve(e));
  });
}

let colorQueue = Promise.resolve();

function setColorQueue(red, green, blue) {
  colorQueue = colorQueue
    .then(() => setColor(red, green, blue))
    .catch((e) => {
      console.error("cannot set color");
    });
  return colorQueue;
}

function debounce(func, wait, immediate) {
  let timeout;
  return function (...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

function mixColor(c1, c2, amount = 0.2) {
  return c1.map((x, i) => {
    return x + (c2[i] - x) * amount;
  });
}

function Action(fn, interval = 1000) {
  this.fn = fn;
  this.interval = interval;
  this.intervalID = null;
}

Action.prototype.start = function (...args) {
  if (this.intervalID) return;
  this.fn(...args);
  this.intervalID = setInterval(() => {
    this.fn(...args);
  }, this.interval);
};

Action.prototype.stop = function () {
  if (!this.intervalID) return;
  clearInterval(this.intervalID);
  this.intervalID = null;
};

const Elements = {
  paletteItems: Array.from(document.querySelectorAll(".palette__item")),
};

const Storage = JSON.parse(localStorage.getItem("specolor")) || {
  palette: Array(Elements.paletteItems.length)
    .fill(0)
    .map((x) => [255, 255, 255]),
};

Storage.setColor = (index, color) => {
  Storage.palette[index] = color;
};

Storage.getColor = (index) => {
  return Storage.palette[index];
};

Storage.save = () => {
  localStorage.setItem("specolor", JSON.stringify(Storage));
};

function loadCanvas() {
  return new Promise((resolve, reject) => {
    const canvas = document.querySelector(".canvas");
    const ctx = canvas.getContext("2d");

    var img = new Image();

    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(ctx);
    };

    img.onerror = reject;

    img.src = CSGate.getSystemPath(SystemPath.EXTENSION) + "/img/spectrum.png";
  });
}

async function mixWithCurrentColor(color) {
  const current = await getColor();
  const mixAmount =
    ((255 -
      Math.abs(
        color.reduce((c, x) => c + x) / 3 - current.reduce((c, x) => c + x) / 3
      )) /
      255) *
      0.039 +
    0.001;
  // console.log("%c Color!", `background-color: rgb(${rgb.join(", ")})`);
  const ncolor = mixColor(current, color, mixAmount);
  setColorQueue(ncolor[0], ncolor[1], ncolor[2]);
}

function bindMouse(ctx) {
  const lastColorEl = document.querySelector(".lastcolor");

  const action = new Action(async () => {
    const xratio = ctx.canvas.width / ctx.canvas.scrollWidth;
    const yratio = ctx.canvas.height / ctx.canvas.scrollHeight;
    const x = Math.round(action.pos[0] * xratio);
    const y = Math.round(action.pos[1] * yratio);
    const rgb = ctx.getImageData(x, y, 1, 1).data.slice(0, 3);

    const rgbString = `rgb(${rgb.join(", ")})`;
    lastColorEl.style.backgroundColor = rgbString;
    lastColorEl.dataset.color = rgb.join(", ");

    await mixWithCurrentColor(rgb);
  }, 100);

  ctx.canvas.addEventListener("mousedown", (e) => {
    action.pos = [e.offsetX, e.offsetY];
    action.start();
  });
  ctx.canvas.addEventListener("mouseup", (e) => {
    action.stop();
  });
  ctx.canvas.addEventListener("mouseleave", (e) => {
    action.stop();
  });
  ctx.canvas.addEventListener("mousemove", (e) => {
    action.pos = [e.offsetX, e.offsetY];
  });
}

function bindPalette() {
  for (let [index, item] of enumerate(Elements.paletteItems)) {
    item.title = "alt-click to add color";
    item.style.backgroundColor = RGBtoCSSColor(Storage.palette[index]);

    const action = new Action(async () => {
      const rgb = CSSColorToRGB(getComputedStyle(item).backgroundColor);
      const crgb = await getColor();
      const mixAmount =
        ((255 -
          Math.abs(
            rgb.reduce((c, x) => c + x) / 3 - crgb.reduce((c, x) => c + x) / 3
          )) /
          255) *
          0.039 +
        0.001;
      const ncolor = mixColor(crgb, rgb, mixAmount);
      setColorQueue(...ncolor);
    }, 100);

    item.addEventListener("mousedown", async (e) => {
      if (e.altKey) {
        let color = await getColor();
        Storage.setColor(index, color);
        Storage.save();
        item.style.backgroundColor = RGBtoCSSColor(color);
      } else {
        action.start();
      }
    });
    item.addEventListener("mouseup", (e) => {
      action.stop();
    });
    item.addEventListener("mouseleave", (e) => {
      action.stop();
    });
  }
}

function clearPalette() {
  for (const [index, item] of enumerate(Elements.paletteItems)) {
    Storage.setColor(index, [255, 255, 255]);
    item.style.backgroundColor = "#fff";
  }
  Storage.save();
}

function bindBlender() {
  const source1 = document.querySelector(".blender__input");
  const source2 = document.querySelector(".blender__output");
  const canvas = document.querySelector(".blender__results");
  const ctx = canvas.getContext("2d");

  function createMix() {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, getComputedStyle(source1).backgroundColor);
    gradient.addColorStop(1, getComputedStyle(source2).backgroundColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  createMix();

  for (let item of [source1, source2]) {
    item.addEventListener("mousedown", async (e) => {
      if (e.altKey) {
        item.style.backgroundColor = RGBtoCSSColor(await getColor());
        createMix();
      } else {
        await setColor(CSSColorToRGB(getComputedStyle(item).backgroundColor));
      }
    });
  }

  canvas.addEventListener("mousedown", async (e) => {
    const xratio = canvas.width / canvas.scrollWidth;
    const yratio = canvas.height / canvas.scrollHeight;
    const x = Math.round(e.offsetX * xratio);
    const y = Math.round(e.offsetY * yratio);
    const rgb = ctx.getImageData(x, y, 1, 1).data.slice(0, 3);
    await setColor(...rgb);
  });
}

function bindLastColor() {
  const lastColorEl = document.querySelector(".lastcolor");

  const action = new Action(async () => {
    const colorString = lastColorEl.dataset.color;
    if (!colorString) return;
    const color = colorString.split(",").map((c) => parseInt(c, 10));
    if (color.find((p) => isNaN(p))) return;
    await mixWithCurrentColor(color);
  }, 100);

  lastColorEl.addEventListener("mousedown", async (e) => {
    action.start();
  });
  lastColorEl.addEventListener("mouseup", (e) => {
    action.stop();
  });
  lastColorEl.addEventListener("mouseleave", (e) => {
    action.stop();
  });
}

function setMenu() {
  const menuString = `
		<Menu>
			<MenuItem Id="clearPaletteMenuItem" Label="Clear Palette" Enabled="true" Checked="false"/>
			<MenuItem Id="reloadPanel" Label="Reload" Enabled="true" Checked="false"/>
		</Menu>
	`;
  CSGate.setPanelFlyoutMenu(menuString);

  CSGate.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", (e) => {
    switch (e.data.menuId) {
      case "clearPaletteMenuItem":
        crearPalette();
        break;
      case "reloadPanel":
        location.reload();
        break;
    }
  });
}

async function main() {
  const [, , canvasCtx] = await Promise.all([
    loadJSX("json2.js"),
    loadJSX("app.jsx"),
    loadCanvas(),
  ]);
  bindMouse(canvasCtx);
  bindPalette();
  bindLastColor();
  bindBlender();
  setMenu();
}

document.addEventListener("DOMContentLoaded", main);
