docker run --rm -v $(pwd):/src -u $(id -u):$(id -g) \
  emscripten/emsdk emcc sobel.c -O3 -o sobel.js -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]'