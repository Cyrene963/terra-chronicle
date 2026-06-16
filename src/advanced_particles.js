/* =========================================================
   Terra Chronicle — 高级粒子系统 v2.0
   Sprite-based 季节粒子：真实樱花/树叶/雪花纹理 + 旋转 + 物理动画

   替代 v1.0 的简单几何形状，提升视觉细腻度和自然感
   ========================================================= */
'use strict';

/* 生成樱花花瓣纹理 */
function generateCherryBlossomTexture() {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 绘制五瓣樱花
    ctx.save();
    ctx.translate(size / 2, size / 2);

    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 5);

        // 花瓣渐变 (粉白渐变)
        const gradient = ctx.createRadialGradient(0, -8, 0, 0, -8, 10);
        gradient.addColorStop(0, 'rgba(255, 220, 230, 0.95)');
        gradient.addColorStop(0.6, 'rgba(255, 182, 203, 0.85)');
        gradient.addColorStop(1, 'rgba(255, 150, 180, 0.3)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, -8, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 中心花蕊
    const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 3);
    centerGradient.addColorStop(0, 'rgba(255, 240, 120, 1)');
    centerGradient.addColorStop(1, 'rgba(255, 200, 100, 0.8)');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    return PIXI.Texture.from(canvas);
}

/* 生成秋季落叶纹理 */
function generateAutumnLeafTexture() {
    const canvas = document.createElement('canvas');
    const size = 28;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(size / 2, size / 2);

    // 枫叶形状 (简化五角)
    const colors = [
        ['rgba(220, 85, 40, 0.9)', 'rgba(180, 60, 20, 0.6)'],   // 深橙红
        ['rgba(240, 160, 50, 0.9)', 'rgba(200, 120, 30, 0.6)'], // 金黄
        ['rgba(190, 75, 50, 0.9)', 'rgba(150, 50, 30, 0.6)']    // 褐红
    ];
    const colorPair = colors[Math.floor(Math.random() * colors.length)];

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
    gradient.addColorStop(0, colorPair[0]);
    gradient.addColorStop(1, colorPair[1]);
    ctx.fillStyle = gradient;

    // 绘制叶片轮廓
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? 12 : 6;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // 叶脉
    ctx.strokeStyle = 'rgba(100, 50, 30, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 8);
    ctx.stroke();

    ctx.restore();

    return PIXI.Texture.from(canvas);
}

/* 生成雪花纹理 */
function generateSnowflakeTexture() {
    const canvas = document.createElement('canvas');
    const size = 24;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(size / 2, size / 2);

    // 六瓣雪花
    ctx.strokeStyle = 'rgba(240, 250, 255, 0.95)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 3);

        // 主轴
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -10);
        ctx.stroke();

        // 分支
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-2, -8);
        ctx.moveTo(0, -6);
        ctx.lineTo(2, -8);
        ctx.stroke();

        ctx.restore();
    }

    // 中心点
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    return PIXI.Texture.from(canvas);
}

/* 高级粒子类 (单个粒子) */
class AdvancedParticle {
    constructor(sprite, config) {
        this.sprite = sprite;
        this.config = config;

        // 物理属性
        this.vx = (Math.random() - 0.5) * config.horizontalSpeed;
        this.vy = config.fallSpeed + Math.random() * config.fallSpeedVariation;
        this.rotationSpeed = (Math.random() - 0.5) * config.rotationSpeed;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.5 + Math.random() * 1.5;

        // 生命周期
        this.age = 0;
        this.lifespan = config.lifespan + Math.random() * config.lifespanVariation;
        this.fadeInDuration = config.fadeInDuration;
        this.fadeOutDuration = config.fadeOutDuration;

        // 初始化精灵
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(config.scale + Math.random() * config.scaleVariation);
        this.sprite.alpha = 0;
    }

    update(deltaTime, screenHeight) {
        this.age += deltaTime;

        // 淡入淡出
        const fadeInProgress = Math.min(1, this.age / this.fadeInDuration);
        const fadeOutStart = this.lifespan - this.fadeOutDuration;
        const fadeOutProgress = this.age > fadeOutStart ?
            1 - (this.lifespan - this.age) / this.fadeOutDuration : 0;

        this.sprite.alpha = Math.min(fadeInProgress, 1 - fadeOutProgress) * this.config.baseAlpha;

        // 横向摆动 (正弦波)
        const sway = Math.sin(this.age * this.swaySpeed + this.swayPhase) * this.config.swayAmplitude;
        this.sprite.x += this.vx + sway * deltaTime;

        // 下落
        this.sprite.y += this.vy * deltaTime;

        // 旋转
        this.sprite.rotation += this.rotationSpeed * deltaTime;

        // 生命周期结束
        return this.age < this.lifespan && this.sprite.y < screenHeight + 50;
    }

    destroy() {
        if (this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }
        this.sprite.destroy();
    }
}

/* 高级粒子发射器 */
class AdvancedParticleEmitter {
    constructor(container, textureGenerator, config) {
        this.container = container;
        this.textureGenerator = textureGenerator;
        this.config = config;
        this.particles = [];
        this.spawnAccumulator = 0;
        this.enabled = false;

        // 预生成多个纹理变体 (增加多样性)
        this.textures = [];
        for (let i = 0; i < config.textureVariants; i++) {
            this.textures.push(textureGenerator());
        }
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    update(deltaTime, screenWidth, screenHeight) {
        if (!this.enabled) return;

        // 生成新粒子
        this.spawnAccumulator += deltaTime;
        const spawnInterval = 1 / this.config.spawnRate;

        while (this.spawnAccumulator >= spawnInterval) {
            this.spawnAccumulator -= spawnInterval;
            this.spawnParticle(screenWidth, screenHeight);
        }

        // 更新现有粒子
        this.particles = this.particles.filter(particle => {
            const alive = particle.update(deltaTime, screenHeight);
            if (!alive) particle.destroy();
            return alive;
        });
    }

    spawnParticle(screenWidth, screenHeight) {
        const texture = this.textures[Math.floor(Math.random() * this.textures.length)];
        const sprite = new PIXI.Sprite(texture);

        // 随机位置 (屏幕上方)
        sprite.x = Math.random() * screenWidth;
        sprite.y = -50 - Math.random() * 100;

        this.container.addChild(sprite);
        const particle = new AdvancedParticle(sprite, this.config);
        this.particles.push(particle);
    }

    clear() {
        this.particles.forEach(p => p.destroy());
        this.particles = [];
    }

    destroy() {
        this.clear();
        this.textures.forEach(tex => tex.destroy(true));
        this.textures = [];
    }
}

/* 季节粒子系统 (管理所有季节的发射器) */
class SeasonalParticleSystem {
    constructor(container) {
        this.container = container;

        // 春 — 樱花花瓣
        this.springEmitter = new AdvancedParticleEmitter(
            container,
            generateCherryBlossomTexture,
            {
                spawnRate: 0.8,
                fallSpeed: 40,
                fallSpeedVariation: 20,
                horizontalSpeed: 15,
                swayAmplitude: 25,
                rotationSpeed: 0.8,
                scale: 0.7,
                scaleVariation: 0.4,
                baseAlpha: 0.85,
                lifespan: 12,
                lifespanVariation: 4,
                fadeInDuration: 0.8,
                fadeOutDuration: 1.5,
                textureVariants: 5
            }
        );

        // 秋 — 落叶
        this.autumnEmitter = new AdvancedParticleEmitter(
            container,
            generateAutumnLeafTexture,
            {
                spawnRate: 1.2,
                fallSpeed: 55,
                fallSpeedVariation: 25,
                horizontalSpeed: 20,
                swayAmplitude: 30,
                rotationSpeed: 1.2,
                scale: 0.8,
                scaleVariation: 0.5,
                baseAlpha: 0.9,
                lifespan: 10,
                lifespanVariation: 3,
                fadeInDuration: 0.6,
                fadeOutDuration: 1.2,
                textureVariants: 6
            }
        );

        // 冬 — 雪花
        this.winterEmitter = new AdvancedParticleEmitter(
            container,
            generateSnowflakeTexture,
            {
                spawnRate: 2.0,
                fallSpeed: 30,
                fallSpeedVariation: 15,
                horizontalSpeed: 8,
                swayAmplitude: 20,
                rotationSpeed: 0.5,
                scale: 0.6,
                scaleVariation: 0.3,
                baseAlpha: 0.75,
                lifespan: 15,
                lifespanVariation: 5,
                fadeInDuration: 1.0,
                fadeOutDuration: 2.0,
                textureVariants: 4
            }
        );

        this.currentSeason = -1;
        this.lastTime = performance.now();
    }

    setSeason(seasonIndex) {
        // 0=春, 1=夏, 2=秋, 3=冬
        if (this.currentSeason === seasonIndex) return;

        this.currentSeason = seasonIndex;

        // 禁用所有发射器
        this.springEmitter.disable();
        this.autumnEmitter.disable();
        this.winterEmitter.disable();

        // 启用对应季节
        switch (seasonIndex) {
            case 0: this.springEmitter.enable(); break;
            case 2: this.autumnEmitter.enable(); break;
            case 3: this.winterEmitter.enable(); break;
            // 夏季无粒子
        }
    }

    update() {
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // 限制最大帧时间
        this.lastTime = now;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        this.springEmitter.update(deltaTime, screenWidth, screenHeight);
        this.autumnEmitter.update(deltaTime, screenWidth, screenHeight);
        this.winterEmitter.update(deltaTime, screenWidth, screenHeight);
    }

    clear() {
        this.springEmitter.clear();
        this.autumnEmitter.clear();
        this.winterEmitter.clear();
    }

    destroy() {
        this.springEmitter.destroy();
        this.autumnEmitter.destroy();
        this.winterEmitter.destroy();
    }
}

/* 导出 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SeasonalParticleSystem };
} else {
    window.SeasonalParticleSystem = SeasonalParticleSystem;
}
