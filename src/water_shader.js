/* =========================================================
   Terra Chronicle — 水面高级 Shader 系统
   v1.0 — 反射 + 折射 + 透明度 + 岸边湿润过渡 + 波纹动画

   基于 GLSL Fragment Shader 实现真实感水面材质:
   - 法线贴图波纹动画 (双层流动)
   - 菲涅尔反射 (视角相关)
   - 深度衰减 (透明度渐变)
   - 岸边泡沫 (程序化噪声)
   - 焦散效果 (可选, 性能开关)
   ========================================================= */
'use strict';

/* Fragment Shader — 水面材质 */
const waterFragmentShader = `
precision mediump float;

varying vec2 vTextureCoord;
varying vec2 vWorldPos;

uniform sampler2D uSampler;
uniform sampler2D uNormalMap;
uniform float uTime;
uniform vec2 uResolution;
uniform float uWaveStrength;
uniform float uFresnelPower;
uniform vec3 uWaterColorShallow;
uniform vec3 uWaterColorDeep;
uniform float uCausticStrength;

// 简易噪声函数 (用于泡沫和焦散)
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 分形布朗运动 (用于泡沫细节)
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for(int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// 焦散效果 (程序化)
float caustics(vec2 p, float time) {
    vec2 uv = p * 0.8;
    vec2 uv1 = uv + vec2(time * 0.08, time * 0.05);
    vec2 uv2 = uv - vec2(time * 0.06, time * 0.07);

    float c1 = fbm(uv1 * 2.5);
    float c2 = fbm(uv2 * 3.0);

    return pow(c1 * c2, 2.0) * 1.5;
}

void main(void) {
    // 双层法线贴图流动 (模拟水波)
    vec2 uv1 = vTextureCoord * 2.0 + vec2(uTime * 0.03, uTime * 0.02);
    vec2 uv2 = vTextureCoord * 2.0 - vec2(uTime * 0.02, uTime * 0.04);

    vec3 normal1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
    vec3 normal2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
    vec3 normal = normalize(normal1 + normal2);

    // 波纹扰动采样坐标
    vec2 distortion = normal.xy * uWaveStrength;
    vec2 distortedUV = vTextureCoord + distortion;

    // 基础颜色 (场景反射, 使用扰动后的UV)
    vec4 baseColor = texture2D(uSampler, distortedUV);

    // 视角方向 (简化: 假设摄像机朝下)
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));

    // 菲涅尔效果 (边缘更亮, 中心透明)
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);

    // 深度衰减 (模拟透明度, 使用世界坐标的伪深度)
    float pseudoDepth = smoothNoise(vWorldPos * 0.1) * 0.3 + 0.7;

    // 水色混合 (深浅水色插值)
    vec3 waterColor = mix(uWaterColorShallow, uWaterColorDeep, pseudoDepth);

    // 岸边泡沫检测 (使用噪声模拟浅水区域)
    float foamNoise = fbm(vWorldPos * 0.05 + vec2(uTime * 0.1));
    float foamMask = smoothstep(0.4, 0.7, foamNoise) * (1.0 - pseudoDepth);

    // 焦散 (可选, 高性能代价)
    float causticPattern = 0.0;
    if(uCausticStrength > 0.0) {
        causticPattern = caustics(vWorldPos * 0.08, uTime) * uCausticStrength;
    }

    // 最终合成
    vec3 finalColor = mix(waterColor, baseColor.rgb, fresnel * 0.3);
    finalColor += vec3(foamMask * 0.8);  // 泡沫高光
    finalColor += vec3(causticPattern);  // 焦散

    // 透明度 (中心透明, 边缘不透明)
    float alpha = mix(0.75, 0.95, fresnel) * (0.85 + pseudoDepth * 0.15);

    gl_FragColor = vec4(finalColor, alpha);
}
`;

/* Vertex Shader — 传递世界坐标 */
const waterVertexShader = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform mat3 uTextureMatrix;

varying vec2 vTextureCoord;
varying vec2 vWorldPos;

void main(void) {
    vec3 worldPos = translationMatrix * vec3(aVertexPosition, 1.0);
    vWorldPos = worldPos.xy;
    vTextureCoord = (uTextureMatrix * vec3(aTextureCoord, 1.0)).xy;
    gl_Position = vec4((projectionMatrix * worldPos).xy, 0.0, 1.0);
}
`;

/* 水面材质类 (封装 PIXI Filter) */
class WaterShaderFilter extends PIXI.Filter {
    constructor(normalMapTexture, options = {}) {
        super(waterVertexShader, waterFragmentShader);

        this.uniforms.uNormalMap = normalMapTexture;
        this.uniforms.uTime = 0;
        this.uniforms.uWaveStrength = options.waveStrength ?? 0.015;
        this.uniforms.uFresnelPower = options.fresnelPower ?? 2.5;
        this.uniforms.uWaterColorShallow = options.waterColorShallow ?? [0.6, 0.85, 0.9];
        this.uniforms.uWaterColorDeep = options.waterColorDeep ?? [0.2, 0.55, 0.7];
        this.uniforms.uCausticStrength = options.causticStrength ?? 0.0; // 默认关闭焦散(性能)

        this.normalMapTexture = normalMapTexture;
        this.normalMapTexture.source.addressMode = 'repeat';
        this.normalMapTexture.source.scaleMode = 'linear';
    }

    apply(filterManager, input, output, clearMode) {
        this.uniforms.uTime += 0.016; // ~60fps
        this.uniforms.uResolution = [input.width, input.height];
        filterManager.applyFilter(this, input, output, clearMode);
    }
}

/* 生成程序化水面法线贴图 */
function generateWaterNormalMap(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // 生成柏林噪声法线
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;

            // 多层噪声叠加
            const scale1 = 0.05, scale2 = 0.12, scale3 = 0.25;
            const n1 = Math.sin(x * scale1) * Math.cos(y * scale1);
            const n2 = Math.sin(x * scale2 + 1.5) * Math.cos(y * scale2);
            const n3 = Math.sin(x * scale3 - 0.8) * Math.cos(y * scale3 + 0.5);
            const height = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * 0.5 + 0.5;

            // 计算梯度 → 法线
            const dx = x < size - 1 ?
                Math.sin((x + 1) * scale1) * Math.cos(y * scale1) - n1 : 0;
            const dy = y < size - 1 ?
                Math.sin(x * scale1) * Math.cos((y + 1) * scale1) - n1 : 0;

            // 法线向量 (转换到 0-255)
            data[idx]     = (dx * 0.5 + 0.5) * 255;  // R = normal.x
            data[idx + 1] = (dy * 0.5 + 0.5) * 255;  // G = normal.y
            data[idx + 2] = 200;                       // B = normal.z (朝上)
            data[idx + 3] = 255;                       // A
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return PIXI.Texture.from(canvas);
}

/* 水面系统工厂函数 */
function createAdvancedWaterSystem(waterContainer, options = {}) {
    // 生成法线贴图
    const normalMap = generateWaterNormalMap(256);

    // 创建 shader filter
    const waterFilter = new WaterShaderFilter(normalMap, {
        waveStrength: options.waveStrength ?? 0.015,
        fresnelPower: options.fresnelPower ?? 2.5,
        waterColorShallow: options.waterColorShallow ?? [0.6, 0.85, 0.9],
        waterColorDeep: options.waterColorDeep ?? [0.2, 0.55, 0.7],
        causticStrength: options.causticStrength ?? 0.0
    });

    // 应用到水面容器
    waterContainer.filters = waterContainer.filters || [];
    waterContainer.filters.push(waterFilter);

    return {
        filter: waterFilter,
        normalMap: normalMap,

        // 运行时调整参数
        setWaveStrength(value) {
            waterFilter.uniforms.uWaveStrength = value;
        },

        setFresnelPower(value) {
            waterFilter.uniforms.uFresnelPower = value;
        },

        setWaterColors(shallow, deep) {
            waterFilter.uniforms.uWaterColorShallow = shallow;
            waterFilter.uniforms.uWaterColorDeep = deep;
        },

        enableCaustics(strength = 0.3) {
            waterFilter.uniforms.uCausticStrength = strength;
        },

        disableCaustics() {
            waterFilter.uniforms.uCausticStrength = 0.0;
        },

        destroy() {
            waterContainer.filters = waterContainer.filters.filter(f => f !== waterFilter);
            waterFilter.destroy();
            normalMap.destroy(true);
        }
    };
}

/* 导出 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WaterShaderFilter, generateWaterNormalMap, createAdvancedWaterSystem };
} else {
    window.WaterShaderSystem = { WaterShaderFilter, generateWaterNormalMap, createAdvancedWaterSystem };
}
