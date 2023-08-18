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
void gray_scale(uint8_t *img_in, int width, int height)
{
    uint8_t *img_out;
    img_out = (uint8_t *)malloc(width * height * 4 * sizeof(uint8_t));

    // 遍历图像中的每个像素
    for (int y = 0; y < height; y++)
    {
        for (int x = 0; x < width; x++)
        {
            // 计算当前像素的索引
            const int pixelIndex = (y * width + x) * 4;

            // 获取当前像素的颜色信息
            const uint8_t red = img_in[pixelIndex];
            const uint8_t green = img_in[pixelIndex + 1];
            const uint8_t blue = img_in[pixelIndex + 2];
            const uint8_t alpha = img_in[pixelIndex + 3];

            // 计算灰度值
            const uint8_t avg = (red + green + blue) / 3;

            // 填充 grayScaleData
            img_out[pixelIndex] = avg;
            img_out[pixelIndex + 1] = avg;
            img_out[pixelIndex + 2] = avg;
            img_out[pixelIndex + 3] = alpha;
        }
    }

    result[0] = (int)img_out;
};

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