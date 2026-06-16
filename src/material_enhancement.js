/* =========================================================
   Terra Chronicle — 材质增强系统 v1.0
   为树木/石头/作物添加纹理细节、法线提示、环境遮蔽

   目标: 减少纯色填充，提升材质表现力，增加光影细腻度
   ========================================================= */
'use strict';

/* ==================== 程序化纹理生成工具 ==================== */

/* 生成木质纹理 (用于树木) */
function generateWoodTexture(width = 128, height = 128, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const baseColor = options.baseColor ?? [100, 70, 50];
    const darkColor = options.darkColor ?? [70, 50, 35];
    const grainDensity = options.grainDensity ?? 0.3;

    // 基础渐变 (年轮效果)
    for (let y = 0; y < height; y++) {
        const wave = Math.sin((y / height) * Math.PI * 8 + Math.random() * 0.5) * 0.15 + 0.85;
        const color = baseColor.map((c, i) => Math.floor(c * wave + darkColor[i] * (1 - wave)));

        ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        ctx.fillRect(0, y, width, 1);
    }

    // 添加木纹噪声
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < grainDensity) {
            const noise = (Math.random() - 0.5) * 30;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
    }

    ctx.putImageData(imageData, 0, 0);

    return PIXI.Texture.from(canvas);
}

/* 生成石头纹理 */
function generateStoneTexture(width = 64, height = 64, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const baseColor = options.baseColor ?? [140, 130, 120];
    const noiseDensity = options.noiseDensity ?? 0.6;

    // 基础颜色
    ctx.fillStyle = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
    ctx.fillRect(0, 0, width, height);

    // 多层噪声 (模拟石头纹理)
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // 分形噪声
            let noise = 0;
            let amplitude = 1;
            let frequency = 0.05;

            for (let octave = 0; octave < 3; octave++) {
                noise += Math.sin(x * frequency + octave) * Math.cos(y * frequency) * amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }

            noise = (noise + 1) * 0.5 * noiseDensity;

            // 应用到每个通道
            data[idx] = Math.floor(data[idx] * (0.7 + noise * 0.6));
            data[idx + 1] = Math.floor(data[idx + 1] * (0.7 + noise * 0.6));
            data[idx + 2] = Math.floor(data[idx + 2] * (0.7 + noise * 0.6));
        }
    }

    // 添加裂纹细节
    ctx.putImageData(imageData, 0, 0);
    ctx.strokeStyle = `rgba(${baseColor[0] - 40}, ${baseColor[1] - 40}, ${baseColor[2] - 40}, 0.4)`;
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        ctx.moveTo(startX, startY);

        for (let j = 0; j < 3; j++) {
            ctx.lineTo(
                startX + (Math.random() - 0.5) * width * 0.5,
                startY + (Math.random() - 0.5) * height * 0.5
            );
        }
        ctx.stroke();
    }

    return PIXI.Texture.from(canvas);
}

/* 生成草叶纹理 (作物/草地细节) */
function generateGrassBladeTexture(width = 32, height = 48, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const tipColor = options.tipColor ?? [140, 200, 100];
    const baseColor = options.baseColor ?? [80, 140, 70];

    // 草叶渐变
    const gradient = ctx.createLinearGradient(width / 2, 0, width / 2, height);
    gradient.addColorStop(0, `rgba(${tipColor[0]}, ${tipColor[1]}, ${tipColor[2]}, 0.9)`);
    gradient.addColorStop(0.7, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.95)`);
    gradient.addColorStop(1, `rgba(${baseColor[0] - 20}, ${baseColor[1] - 20}, ${baseColor[2] - 20}, 0.8)`);

    // 绘制草叶形状
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.quadraticCurveTo(width * 0.7, height * 0.3, width * 0.6, height * 0.7);
    ctx.quadraticCurveTo(width * 0.55, height, width / 2, height);
    ctx.quadraticCurveTo(width * 0.45, height, width * 0.4, height * 0.7);
    ctx.quadraticCurveTo(width * 0.3, height * 0.3, width / 2, 0);
    ctx.fill();

    // 中脉
    ctx.strokeStyle = `rgba(${baseColor[0] - 30}, ${baseColor[1] - 30}, ${baseColor[2] - 30}, 0.6)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 2);
    ctx.lineTo(width / 2, height - 2);
    ctx.stroke();

    return PIXI.Texture.from(canvas);
}

/* ==================== 法线贴图生成 (用于光照计算) ==================== */

function generateNormalMapFromHeightMap(heightMapCanvas) {
    const width = heightMapCanvas.width;
    const height = heightMapCanvas.height;

    const ctx = heightMapCanvas.getContext('2d');
    const heightData = ctx.getImageData(0, 0, width, height);

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = width;
    normalCanvas.height = height;
    const normalCtx = normalCanvas.getContext('2d');
    const normalData = normalCtx.createImageData(width, height);

    // Sobel 算子计算法线
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const getHeight = (ox, oy) => {
                const idx = ((y + oy) * width + (x + ox)) * 4;
                return heightData.data[idx] / 255;
            };

            // 水平梯度
            const gx = -getHeight(-1, -1) - 2 * getHeight(-1, 0) - getHeight(-1, 1)
                       + getHeight(1, -1) + 2 * getHeight(1, 0) + getHeight(1, 1);

            // 垂直梯度
            const gy = -getHeight(-1, -1) - 2 * getHeight(0, -1) - getHeight(1, -1)
                       + getHeight(-1, 1) + 2 * getHeight(0, 1) + getHeight(1, 1);

            // 法线向量
            const nx = -gx;
            const ny = -gy;
            const nz = 1;

            // 归一化
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const normalX = (nx / len) * 0.5 + 0.5;
            const normalY = (ny / len) * 0.5 + 0.5;
            const normalZ = (nz / len) * 0.5 + 0.5;

            const idx = (y * width + x) * 4;
            normalData.data[idx] = normalX * 255;
            normalData.data[idx + 1] = normalY * 255;
            normalData.data[idx + 2] = normalZ * 255;
            normalData.data[idx + 3] = 255;
        }
    }

    normalCtx.putImageData(normalData, 0, 0);
    return PIXI.Texture.from(normalCanvas);
}

/* ==================== 环境遮蔽 (Ambient Occlusion) ==================== */

function generateAOTexture(width = 128, height = 128, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const aoStrength = options.strength ?? 0.4;
    const edgeDarkness = options.edgeDarkness ?? 0.6;

    // 径向渐变 (边缘暗, 中心亮)
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width / 2
    );

    gradient.addColorStop(0, `rgba(255, 255, 255, ${1 - aoStrength})`);
    gradient.addColorStop(0.7, `rgba(200, 200, 200, ${1 - aoStrength * 0.7})`);
    gradient.addColorStop(1, `rgba(100, 100, 100, ${1 - edgeDarkness})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 添加细节噪声
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);

    return PIXI.Texture.from(canvas);
}

/* ==================== 材质增强管理器 ==================== */

class MaterialEnhancementSystem {
    constructor() {
        this.textures = new Map();
        this.normalMaps = new Map();
        this.aoMaps = new Map();

        // 预生成常用纹理
        this.pregenerate();
    }

    pregenerate() {
        // 树木材质
        this.textures.set('tree_oak', generateWoodTexture(128, 128, {
            baseColor: [100, 70, 50],
            darkColor: [70, 50, 35]
        }));

        this.textures.set('tree_cherry', generateWoodTexture(128, 128, {
            baseColor: [110, 80, 60],
            darkColor: [80, 60, 45]
        }));

        // 石头材质
        this.textures.set('rock', generateStoneTexture(64, 64, {
            baseColor: [140, 130, 120]
        }));

        // 草叶材质 (用于作物)
        this.textures.set('grass_blade', generateGrassBladeTexture(32, 48, {
            tipColor: [140, 200, 100],
            baseColor: [80, 140, 70]
        }));

        // 环境遮蔽贴图
        this.aoMaps.set('default', generateAOTexture(128, 128, {
            strength: 0.4,
            edgeDarkness: 0.6
        }));

        console.log('[MaterialEnhancement] Textures pregenerated:', this.textures.size);
    }

    getTexture(name) {
        return this.textures.get(name);
    }

    getNormalMap(name) {
        return this.normalMaps.get(name);
    }

    getAOMap(name) {
        return this.aoMaps.get(name);
    }

    // 为精灵应用材质增强
    enhanceSprite(sprite, materialType, options = {}) {
        const texture = this.getTexture(materialType);
        if (!texture) {
            console.warn(`[MaterialEnhancement] Unknown material type: ${materialType}`);
            return;
        }

        // 应用纹理 (保持原精灵的tint和alpha)
        const originalTint = sprite.tint;
        const originalAlpha = sprite.alpha;

        sprite.texture = texture;
        sprite.tint = originalTint;
        sprite.alpha = originalAlpha;

        // 应用 AO (作为乘法混合层)
        if (options.enableAO) {
            const aoSprite = new PIXI.Sprite(this.getAOMap('default'));
            aoSprite.width = sprite.width;
            aoSprite.height = sprite.height;
            aoSprite.anchor.copyFrom(sprite.anchor);
            aoSprite.position.copyFrom(sprite.position);
            aoSprite.blendMode = 'multiply';
            aoSprite.alpha = 0.5;

            if (sprite.parent) {
                sprite.parent.addChildAt(aoSprite, sprite.parent.getChildIndex(sprite));
            }

            sprite._aoOverlay = aoSprite;
        }

        return sprite;
    }

    destroy() {
        this.textures.forEach(tex => tex.destroy(true));
        this.normalMaps.forEach(tex => tex.destroy(true));
        this.aoMaps.forEach(tex => tex.destroy(true));

        this.textures.clear();
        this.normalMaps.clear();
        this.aoMaps.clear();
    }
}

/* 导出 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateWoodTexture,
        generateStoneTexture,
        generateGrassBladeTexture,
        generateNormalMapFromHeightMap,
        generateAOTexture,
        MaterialEnhancementSystem
    };
} else {
    window.MaterialEnhancement = {
        generateWoodTexture,
        generateStoneTexture,
        generateGrassBladeTexture,
        generateNormalMapFromHeightMap,
        generateAOTexture,
        MaterialEnhancementSystem
    };
}
