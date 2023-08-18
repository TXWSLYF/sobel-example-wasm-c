#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <emscripten/emscripten.h>
#include <stdint.h> // 包含 uint8_t 所在的头文件

EMSCRIPTEN_KEEPALIVE
uint8_t *create_buffer(int width, int height)
{
    return malloc(width * height * 4 * sizeof(uint8_t));
}

EMSCRIPTEN_KEEPALIVE
void destroy_buffer(uint8_t *p)
{
    free(p);
}

int result[1];
EMSCRIPTEN_KEEPALIVE
void sobel(uint8_t *img_in, int width, int height)
{
    uint8_t *img_out;
    img_out = (uint8_t *)malloc(width * height * 4 * sizeof(uint8_t));

    const int Gx[3][3] = {
        {-1, 0, 1},
        {-2, 0, 2},
        {-1, 0, 1}};

    const int Gy[3][3] = {
        {-1, -2, -1},
        {0, 0, 0},
        {1, 2, 1}};

    for (int y = 1; y < height - 1; y++)
    {
        for (int x = 1; x < width - 1; x++)
        {
            int sumX = 0;
            int sumY = 0;

            for (int j = 0; j < 3; j++)
            {
                for (int i = 0; i < 3; i++)
                {
                    const int pixelIndex = (y + j - 1) * width + (x + i - 1);
                    const int pixelValue = img_in[pixelIndex * 4];

                    sumX += pixelValue * Gx[j][i];
                    sumY += pixelValue * Gy[j][i];
                }
            }

            int gradientMagnitude = sqrt(sumX * sumX + sumY * sumY);
            const int outputPixelIndex = (y * width + x) * 4;


            // int 转为 uint8_t 会溢出
            if (gradientMagnitude > 255)
            {
                gradientMagnitude = 255;
            }

            img_out[outputPixelIndex] = gradientMagnitude;
            img_out[outputPixelIndex + 1] = gradientMagnitude;
            img_out[outputPixelIndex + 2] = gradientMagnitude;
            img_out[outputPixelIndex + 3] = 255; // Alpha channel
        }
    }

    result[0] = (int)img_out;
}

EMSCRIPTEN_KEEPALIVE
void free_result(uint8_t *result)
{
    free(result);
}

EMSCRIPTEN_KEEPALIVE
int get_result_pointer()
{
    return result[0];
}