const inputFile = document.getElementById("input-file");
const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");
const canvas3 = document.getElementById("canvas3");

const ctx1 = canvas1.getContext("2d", { willReadFrequently: true });
const ctx2 = canvas2.getContext("2d", { willReadFrequently: true });
const ctx3 = canvas3.getContext("2d", { willReadFrequently: true });

async function loadImage(src) {
  // Load image
  const imgBlob = await fetch(src).then((resp) => resp.blob());
  const img = await createImageBitmap(imgBlob);
  // Make canvas same size as image
  canvas1.width = img.width;
  canvas1.height = img.height;

  // Draw image
  ctx1.drawImage(img, 0, 0);
  return ctx1.getImageData(0, 0, img.width, img.height);
}

const Gx = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];
const Gy = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
];

// Sobel image edge detection algorithm in Javascript
function sobelAlgorithm(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const outputData = new Uint8ClampedArray(imageData.data.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumX = 0;
      let sumY = 0;

      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const pixelIndex = (y + j - 1) * width + (x + i - 1);
          const pixelValue = imageData.data[pixelIndex * 4];
          sumX += pixelValue * Gx[j][i];
          sumY += pixelValue * Gy[j][i];
        }
      }

      const gradientMagnitude = Math.sqrt(sumX * sumX + sumY * sumY);
      // Rounding to an integer
      const normalizedMagnitude = gradientMagnitude >>> 0;

      const outputPixelIndex = (y * width + x) * 4;
      outputData[outputPixelIndex] = normalizedMagnitude;
      outputData[outputPixelIndex + 1] = normalizedMagnitude;
      outputData[outputPixelIndex + 2] = normalizedMagnitude;
      outputData[outputPixelIndex + 3] = 255; // Alpha channel
    }
  }

  return new ImageData(outputData, width, height);
}

// Detect image edges using the Sobel algorithm in both native JavaScript and WebAssembly, and draw them to canvas
function appleSobelDrawImageData(api, imageData) {
  const { width, height } = imageData;

  canvas2.width = width;
  canvas2.height = height;
  canvas3.width = width;
  canvas3.height = height;

  const p = api.create_buffer(width, height);
  Module.HEAPU8.set(imageData.data, p);

  console.time("codeExecution c++");
  api.sobel(p, width, height);
  // api.gray_scale(p, image.width, image.height);
  console.timeEnd("codeExecution c++");

  const resultPointer = api.get_result_pointer();
  const resultView = new Uint8ClampedArray(
    Module.HEAPU8.buffer,
    resultPointer,
    width * height * 4
  );
  api.free_result(resultPointer);
  api.destroy_buffer(p);

  const outImageData = new ImageData(resultView, width, height);
  ctx2.putImageData(outImageData, 0, 0);

  console.time("codeExecution javascript");
  const sobelData = sobelAlgorithm(imageData);
  console.timeEnd("codeExecution javascript");

  ctx3.putImageData(sobelData, 0, 0);
}

Module.onRuntimeInitialized = (_) => {
  // Create wrapper functions for all the exported C functions
  const api = {
    create_buffer: Module.cwrap("create_buffer", "number", [
      "number",
      "number",
    ]),
    destroy_buffer: Module.cwrap("destroy_buffer", "", ["number"]),
    gray_scale: Module.cwrap("gray_scale", "", ["number", "number", "number"]),
    sobel: Module.cwrap("sobel", "", ["number", "number", "number"]),
    free_result: Module.cwrap("free_result", "", ["number"]),
    get_result_pointer: Module.cwrap("get_result_pointer", "number", []),
  };

  loadImage("bocchi.JPG").then((imageData) => {
    appleSobelDrawImageData(api, imageData);
  });

  inputFile.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();

        img.onload = function () {
          const { width, height } = img;
          canvas1.width = width;
          canvas1.height = height;
          ctx1.drawImage(img, 0, 0);
          const imageData = ctx1.getImageData(0, 0, width, height);

          appleSobelDrawImageData(api, imageData);
        };

        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
};
