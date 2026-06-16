/* =========================================================
   Terra Chronicle — 后处理系统 v1.0
   Bloom / Fog / God Rays / Vignette

   提升环境氛围的细腻生动度，为魔法、光照、深度感提供专业级视觉
   ========================================================= */
'use strict';

/* ==================== Bloom 泛光滤镜 ==================== */
/* 用途: 魔法光晕、太阳光芒、灵兽能量、炼金特效 */

class BloomFilter extends PIXI.Filter {
    constructor(options = {}) {
        const fragmentShader = `
            precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float uBloomStrength;
            uniform float uBloomThreshold;
            uniform vec2 uResolution;

            // 9-tap高斯模糊
            vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
                vec4 color = vec4(0.0);
                vec2 off1 = vec2(1.3846153846) * direction;
                vec2 off2 = vec2(3.2307692308) * direction;
                color += texture2D(image, uv) * 0.2270270270;
                color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;
                color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;
                color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;
                color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;
                return color;
            }

            void main(void) {
                vec4 original = texture2D(uSampler, vTextureCoord);

                // 提取高亮区域 (超过阈值)
                float brightness = dot(original.rgb, vec3(0.2126, 0.7152, 0.0722));
                vec4 bright = brightness > uBloomThreshold ? original : vec4(0.0);

                // 双向模糊
                vec4 blurH = blur9(uSampler, vTextureCoord, uResolution, vec2(1.0, 0.0));
                vec4 blurV = blur9(uSampler, vTextureCoord, uResolution, vec2(0.0, 1.0));
                vec4 bloom = (blurH + blurV) * 0.5;

                // 合成
                gl_FragColor = original + bloom * uBloomStrength;
            }
        `;

        super(null, fragmentShader);

        this.uniforms.uBloomStrength = options.strength ?? 0.6;
        this.uniforms.uBloomThreshold = options.threshold ?? 0.7;
        this.uniforms.uResolution = [1, 1];
    }

    apply(filterManager, input, output, clearMode) {
        this.uniforms.uResolution = [input.width, input.height];
        filterManager.applyFilter(this, input, output, clearMode);
    }
}

/* ==================== 深度雾滤镜 ==================== */
/* 用途: 远景衰减、神秘氛围、季节雾气 */

class FogFilter extends PIXI.Filter {
    constructor(options = {}) {
        const fragmentShader = `
            precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform vec3 uFogColor;
            uniform float uFogDensity;
            uniform float uFogStart;
            uniform float uFogEnd;

            void main(void) {
                vec4 original = texture2D(uSampler, vTextureCoord);

                // 伪深度 (基于 Y 坐标)
                float depth = vTextureCoord.y;

                // 线性雾 (从 fogStart 到 fogEnd)
                float fogFactor = clamp((depth - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);
                fogFactor = pow(fogFactor, uFogDensity);

                // 混合雾色
                vec3 finalColor = mix(original.rgb, uFogColor, fogFactor);

                gl_FragColor = vec4(finalColor, original.a);
            }
        `;

        super(null, fragmentShader);

        this.uniforms.uFogColor = options.color ?? [0.8, 0.85, 0.9];
        this.uniforms.uFogDensity = options.density ?? 1.5;
        this.uniforms.uFogStart = options.start ?? 0.3;
        this.uniforms.uFogEnd = options.end ?? 0.9;
    }
}

/* ==================== 体积光 (God Rays) ==================== */
/* 用途: 太阳光束、魔法阵召唤、地城入口 */

class GodRaysFilter extends PIXI.Filter {
    constructor(lightPosition, options = {}) {
        const fragmentShader = `
            precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform vec2 uLightPosition;
            uniform float uDecay;
            uniform float uWeight;
            uniform float uDensity;
            uniform float uExposure;
            uniform vec3 uLightColor;

            const int NUM_SAMPLES = 80;

            void main(void) {
                vec4 original = texture2D(uSampler, vTextureCoord);

                // 从光源向外辐射采样
                vec2 deltaTextCoord = vTextureCoord - uLightPosition;
                deltaTextCoord *= 1.0 / float(NUM_SAMPLES) * uDensity;

                float illuminationDecay = 1.0;
                vec3 accumulated = vec3(0.0);

                for(int i = 0; i < NUM_SAMPLES; i++) {
                    vec2 sampleCoord = vTextureCoord - deltaTextCoord * float(i);
                    vec4 sampleColor = texture2D(uSampler, sampleCoord);

                    // 累加发光部分
                    float brightness = dot(sampleColor.rgb, vec3(0.2126, 0.7152, 0.0722));
                    accumulated += sampleColor.rgb * illuminationDecay * uWeight * brightness;

                    illuminationDecay *= uDecay;
                }

                accumulated *= uExposure;
                vec3 finalColor = original.rgb + accumulated * uLightColor;

                gl_FragColor = vec4(finalColor, original.a);
            }
        `;

        super(null, fragmentShader);

        this.uniforms.uLightPosition = lightPosition ?? [0.5, 0.3];
        this.uniforms.uDecay = options.decay ?? 0.97;
        this.uniforms.uWeight = options.weight ?? 0.4;
        this.uniforms.uDensity = options.density ?? 0.8;
        this.uniforms.uExposure = options.exposure ?? 0.5;
        this.uniforms.uLightColor = options.lightColor ?? [1.0, 0.95, 0.85];
    }

    setLightPosition(x, y) {
        this.uniforms.uLightPosition = [x, y];
    }
}

/* ==================== 增强晕影 (Enhanced Vignette) ==================== */
/* 用途: 视觉聚焦、电影感、战斗紧张氛围 */

class EnhancedVignetteFilter extends PIXI.Filter {
    constructor(options = {}) {
        const fragmentShader = `
            precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float uVignetteStrength;
            uniform float uVignetteSoftness;
            uniform vec2 uVignetteCenter;
            uniform vec3 uVignetteColor;

            void main(void) {
                vec4 original = texture2D(uSampler, vTextureCoord);

                // 距离中心的距离
                vec2 centered = vTextureCoord - uVignetteCenter;
                float dist = length(centered);

                // 平滑衰减曲线
                float vignette = smoothstep(uVignetteStrength, uVignetteStrength - uVignetteSoftness, dist);

                // 混合晕影颜色
                vec3 finalColor = mix(uVignetteColor, original.rgb, vignette);

                gl_FragColor = vec4(finalColor, original.a);
            }
        `;

        super(null, fragmentShader);

        this.uniforms.uVignetteStrength = options.strength ?? 0.9;
        this.uniforms.uVignetteSoftness = options.softness ?? 0.6;
        this.uniforms.uVignetteCenter = options.center ?? [0.5, 0.5];
        this.uniforms.uVignetteColor = options.color ?? [0.0, 0.0, 0.0];
    }
}

/* ==================== 色差 (Chromatic Aberration) ==================== */
/* 用途: 魔法扭曲、传送门、时空效果 */

class ChromaticAberrationFilter extends PIXI.Filter {
    constructor(options = {}) {
        const fragmentShader = `
            precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float uStrength;
            uniform vec2 uCenter;

            void main(void) {
                vec2 direction = vTextureCoord - uCenter;
                float dist = length(direction);
                vec2 offset = normalize(direction) * dist * uStrength;

                // 分离 RGB 通道
                float r = texture2D(uSampler, vTextureCoord - offset * 0.5).r;
                float g = texture2D(uSampler, vTextureCoord).g;
                float b = texture2D(uSampler, vTextureCoord + offset * 0.5).b;

                gl_FragColor = vec4(r, g, b, 1.0);
            }
        `;

        super(null, fragmentShader);

        this.uniforms.uStrength = options.strength ?? 0.003;
        this.uniforms.uCenter = options.center ?? [0.5, 0.5];
    }
}

/* ==================== 后处理管线系统 ==================== */
class PostProcessingPipeline {
    constructor(container) {
        this.container = container;
        this.filters = [];
        this.filterMap = new Map();

        // 初始化滤镜 (默认禁用)
        this.bloom = new BloomFilter({ strength: 0.5, threshold: 0.7 });
        this.fog = new FogFilter({ density: 1.2, start: 0.4, end: 0.85 });
        this.vignette = new EnhancedVignetteFilter({ strength: 0.8, softness: 0.5 });

        this.godRays = null; // 按需创建 (性能代价高)
        this.chromatic = null;

        // 性能级别
        this.qualityLevel = 2; // 0=低, 1=中, 2=高
    }

    enableBloom(options = {}) {
        if (options.strength !== undefined) this.bloom.uniforms.uBloomStrength = options.strength;
        if (options.threshold !== undefined) this.bloom.uniforms.uBloomThreshold = options.threshold;

        if (!this.filterMap.has('bloom')) {
            this.filters.push(this.bloom);
            this.filterMap.set('bloom', this.bloom);
            this.updateContainer();
        }
    }

    disableBloom() {
        if (this.filterMap.has('bloom')) {
            this.filters = this.filters.filter(f => f !== this.bloom);
            this.filterMap.delete('bloom');
            this.updateContainer();
        }
    }

    enableFog(options = {}) {
        if (options.color !== undefined) this.fog.uniforms.uFogColor = options.color;
        if (options.density !== undefined) this.fog.uniforms.uFogDensity = options.density;
        if (options.start !== undefined) this.fog.uniforms.uFogStart = options.start;
        if (options.end !== undefined) this.fog.uniforms.uFogEnd = options.end;

        if (!this.filterMap.has('fog')) {
            this.filters.push(this.fog);
            this.filterMap.set('fog', this.fog);
            this.updateContainer();
        }
    }

    disableFog() {
        if (this.filterMap.has('fog')) {
            this.filters = this.filters.filter(f => f !== this.fog);
            this.filterMap.delete('fog');
            this.updateContainer();
        }
    }

    enableVignette(options = {}) {
        if (options.strength !== undefined) this.vignette.uniforms.uVignetteStrength = options.strength;
        if (options.softness !== undefined) this.vignette.uniforms.uVignetteSoftness = options.softness;

        if (!this.filterMap.has('vignette')) {
            this.filters.push(this.vignette);
            this.filterMap.set('vignette', this.vignette);
            this.updateContainer();
        }
    }

    disableVignette() {
        if (this.filterMap.has('vignette')) {
            this.filters = this.filters.filter(f => f !== this.vignette);
            this.filterMap.delete('vignette');
            this.updateContainer();
        }
    }

    enableGodRays(lightPosition, options = {}) {
        if (!this.godRays) {
            this.godRays = new GodRaysFilter(lightPosition, options);
        } else {
            this.godRays.setLightPosition(lightPosition[0], lightPosition[1]);
        }

        if (!this.filterMap.has('godRays')) {
            this.filters.push(this.godRays);
            this.filterMap.set('godRays', this.godRays);
            this.updateContainer();
        }
    }

    disableGodRays() {
        if (this.filterMap.has('godRays')) {
            this.filters = this.filters.filter(f => f !== this.godRays);
            this.filterMap.delete('godRays');
            this.updateContainer();
        }
    }

    enableChromaticAberration(options = {}) {
        if (!this.chromatic) {
            this.chromatic = new ChromaticAberrationFilter(options);
        }

        if (!this.filterMap.has('chromatic')) {
            this.filters.push(this.chromatic);
            this.filterMap.set('chromatic', this.chromatic);
            this.updateContainer();
        }
    }

    disableChromaticAberration() {
        if (this.filterMap.has('chromatic')) {
            this.filters = this.filters.filter(f => f !== this.chromatic);
            this.filterMap.delete('chromatic');
            this.updateContainer();
        }
    }

    setQualityLevel(level) {
        this.qualityLevel = level;

        // 根据性能级别自动调整
        if (level === 0) {
            // 低质量: 禁用所有后处理
            this.disableBloom();
            this.disableFog();
            this.disableGodRays();
            this.disableChromaticAberration();
        } else if (level === 1) {
            // 中质量: 仅基础效果
            this.disableGodRays();
            this.disableChromaticAberration();
        }
        // 高质量: 保持用户选择
    }

    updateContainer() {
        this.container.filters = this.filters.length > 0 ? this.filters : null;
    }

    destroy() {
        this.filters.forEach(f => f.destroy());
        this.filters = [];
        this.filterMap.clear();
        this.container.filters = null;
    }
}

/* 导出 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BloomFilter,
        FogFilter,
        GodRaysFilter,
        EnhancedVignetteFilter,
        ChromaticAberrationFilter,
        PostProcessingPipeline
    };
} else {
    window.PostProcessing = {
        BloomFilter,
        FogFilter,
        GodRaysFilter,
        EnhancedVignetteFilter,
        ChromaticAberrationFilter,
        PostProcessingPipeline
    };
}
