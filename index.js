// const inputFile = document.getElementById("input-file");
const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");
const canvas3 = document.getElementById("canvas3");

const ctx1 = canvas1.getContext("2d");
const ctx2 = canvas2.getContext("2d");
const ctx3 = canvas3.getContext("2d");

async function loadImage(src) {
  // Load image
  const imgBlob = await fetch(src).then((resp) => resp.blob());
  const img = await createImageBitmap(imgBlob);
  // Make canvas same size as image
  canvas1.width = img.width;
  canvas1.height = img.height;

  canvas2.width = img.width;
  canvas2.height = img.height;

  canvas3.width = img.width;
  canvas3.height = img.height;

  // Draw image
  ctx1.drawImage(img, 0, 0);
  return ctx1.getImageData(0, 0, img.width, img.height);
}

// 定义水平和垂直方向的 Sobel 卷积核
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

// 对灰度图像应用 Sobel 算法
function applySobel(imageData) {
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
          if (y === 1 && x === 1) {
            console.log(pixelValue);
          }
        }
      }
      const gradientMagnitude = Math.sqrt(sumX * sumX + sumY * sumY);
      const normalizedMagnitude = gradientMagnitude >>> 0; // 取整

      const outputPixelIndex = (y * width + x) * 4;
      outputData[outputPixelIndex] = normalizedMagnitude;
      outputData[outputPixelIndex + 1] = normalizedMagnitude;
      outputData[outputPixelIndex + 2] = normalizedMagnitude;
      outputData[outputPixelIndex + 3] = 255; // Alpha channel

      if (y === 497 && x === 324) {
        console.log(outputPixelIndex);
        console.log(gradientMagnitude, normalizedMagnitude);
        console.log(sumX, sumY);
      }
    }
  }
  return new ImageData(outputData, width, height);
}

Module.onRuntimeInitialized = (_) => {
  // Create wrapper functions for all the exported C functions
  const api = {
    create_buffer: Module.cwrap("create_buffer", "number", [
      "number",
      "number",
    ]),
    destroy_buffer: Module.cwrap("destroy_buffer", "", ["number"]),
    sobel: Module.cwrap("sobel", "", ["number", "number", "number"]),
    free_result: Module.cwrap("free_result", "", ["number"]),
    get_result_pointer: Module.cwrap("get_result_pointer", "number", []),
  };

  loadImage("IMG_1254.JPG").then((image) => {
    const p = api.create_buffer(image.width, image.height);
    Module.HEAPU8.set(image.data, p);

    console.time("codeExecution c++");
    api.sobel(p, image.width, image.height);
    console.timeEnd("codeExecution c++");

    const resultPointer = api.get_result_pointer();
    const resultView = new Uint8ClampedArray(
      Module.HEAPU8.buffer,
      resultPointer,
      image.width * image.height * 4
    );
    api.free_result(resultPointer);
    api.destroy_buffer(p);
    const outImageData = new ImageData(resultView, image.width, image.height);
    ctx2.putImageData(outImageData, 0, 0);

    console.time("codeExecution js");
    const sobelData = applySobel(image);
    console.timeEnd("codeExecution js");

    ctx3.putImageData(sobelData, 0, 0);
  });
};
