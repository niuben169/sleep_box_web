// 音频引擎 - 处理白噪声生成和音频控制
class AudioEngine {
    constructor() {
        // 初始化Web Audio API
        this.audioContext = null;
        this.masterGain = null;
        this.noiseSources = {};
        this.noiseGains = {};
        this.playing = false;
        this.timer = null;
        this.timerEndTime = null;
        this.playStartTime = null; // 记录播放开始时间
        this.fadeOutTimer = null; // 淡出定时器
        
        // 淡入淡出配置参数
        this.fadeInDuration = 10; // 淡入时长（秒）
        this.fadeOutDuration = 60; // 淡出时长（秒）
        this.fadeInEnabled = true; // 是否启用淡入
        this.fadeOutEnabled = true; // 是否启用淡出
        
        // 噪声类型定义
        this.noiseTypes = ['white', 'pink', 'brown', 'rain', 'ocean', 'forest', 'chanting', 'fire', 'seagulls', 'waves', 'chanting_sutras', 'guzheng', 'piano'];
        
        // 初始化音频上下文
        this.initAudioContext();
    }
    
    // 初始化音频上下文
    initAudioContext() {
        try {
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建主音量控制
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5; // 默认50%音量
            this.masterGain.connect(this.audioContext.destination);
            
            console.log('音频引擎初始化成功');
        } catch (error) {
            console.error('音频引擎初始化失败:', error);
            alert('您的浏览器不支持Web Audio API，无法播放声音。');
        }
    }
    
    // 开始播放所有启用的噪声
    start() {
        if (!this.audioContext) return;
        
        // 如果上下文被暂停，恢复它
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.playing = true;
        this.playStartTime = Date.now(); // 记录播放开始时间
        
        console.log('开始播放音频');
        
        // 如果启用了淡入功能，重置主音量并开始淡入
        if (this.fadeInEnabled && this.masterGain) {
            // 记录当前目标音量（用户设置的音量）
            const targetVolume = this.masterGain.gain.value;
            
            // 获取精确的当前时间
            const now = this.audioContext.currentTime;
            
            // 先将音量设置为0
            this.masterGain.gain.setValueAtTime(0, now);
            
            // 使用线性渐变确保平滑过渡
            this.masterGain.gain.linearRampToValueAtTime(targetVolume, now + this.fadeInDuration);
            
            console.log(`开始淡入效果，持续${this.fadeInDuration}秒`);
        }
    }
    
    // 停止播放所有噪声
    stop() {
        if (!this.audioContext) return;
        
        // 停止所有噪声源
        for (const noiseType of this.noiseTypes) {
            this.stopNoise(noiseType);
        }
        
        this.playing = false;
        this.playStartTime = null;
        
        // 清除定时器
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            this.timerEndTime = null;
        }
        
        // 清除淡出定时器
        if (this.fadeOutTimer) {
            clearTimeout(this.fadeOutTimer);
            this.fadeOutTimer = null;
        }
        
        console.log('停止播放音频');
    }
    
    // 设置主音量
    setMasterVolume(volume) {
        if (!this.masterGain) return;
        
        // 音量范围0-1
        const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
        
        // 检查是否在淡入期间
        let rampDuration = 0.1; // 默认短时间过渡
        if (this.fadeInEnabled && this.playStartTime) {
            const playTimeElapsed = (Date.now() - this.playStartTime) / 1000; // 已播放时间（秒）
            if (playTimeElapsed < this.fadeInDuration) {
                // 仍然在淡入期间，调整剩余的淡入时间
                rampDuration = this.fadeInDuration - playTimeElapsed;
                // 计算当前应该达到的音量比例
                const currentFadeProgress = playTimeElapsed / this.fadeInDuration;
                
                // 先设置到当前进度应该达到的音量
                this.masterGain.gain.setValueAtTime(
                    normalizedVolume * currentFadeProgress, 
                    this.audioContext.currentTime
                );
            }
        }
        
        // 使用线性Ramp来平滑音量变化
        this.masterGain.gain.linearRampToValueAtTime(
            normalizedVolume, 
            this.audioContext.currentTime + rampDuration
        );
        
        console.log('主音量设置为:', normalizedVolume);
    }
    
    // 播放特定类型的噪声
    playNoise(noiseType) {
        if (!this.audioContext || !this.playing) return;
        
        // 停止已存在的噪声
        this.stopNoise(noiseType);
        
        // 检查是否是环境音效类型
        const isAmbientSound = ['rain', 'ocean', 'forest', 'chanting', 'fire', 'seagulls', 'waves', 'chanting_sutras', 'guzheng', 'piano'].includes(noiseType);
        
        if (isAmbientSound) {
            // 对于环境音效，先创建增益节点，但不立即播放
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0; // 初始音量为0
            
            // 连接到主增益节点
            gainNode.connect(this.masterGain);
            
            // 保存增益节点引用
            this.noiseGains[noiseType] = gainNode;
            
            // 尝试加载音频文件
            this.loadAmbientSound(noiseType);
        } else {
            // 对于合成噪声，直接创建并播放
            const source = this.createNoiseSource(noiseType);
            
            // 创建增益节点控制单个噪声的音量
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0; // 初始音量为0
            
            // 连接节点
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // 启动噪声源
            source.start();
            
            // 保存引用
            this.noiseSources[noiseType] = source;
            this.noiseGains[noiseType] = gainNode;
            
            console.log('开始播放噪声:', noiseType);
        }
    }
    
    // 停止特定类型的噪声
    stopNoise(noiseType) {
        if (this.noiseSources[noiseType]) {
            try {
                this.noiseSources[noiseType].stop();
            } catch (error) {
                // 如果源已经停止，忽略错误
            }
            delete this.noiseSources[noiseType];
        }
        
        if (this.noiseGains[noiseType]) {
            delete this.noiseGains[noiseType];
        }
    }
    
    // 设置特定噪声的音量
    setNoiseVolume(noiseType, volume) {
        if (!this.noiseGains[noiseType]) return;
        
        // 音量范围0-1
        const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
        
        // 使用线性Ramp来平滑音量变化
        this.noiseGains[noiseType].gain.linearRampToValueAtTime(
            normalizedVolume, 
            this.audioContext.currentTime + 0.1
        );
        
        console.log('噪声', noiseType, '音量设置为:', normalizedVolume);
    }
    
    // 创建噪声源
    createNoiseSource(noiseType) {
        const source = this.audioContext.createBufferSource();
        
        // 根据噪声类型生成不同的缓冲区
        switch (noiseType) {
            case 'white':
                source.buffer = this.generateWhiteNoise();
                break;
            case 'pink':
                source.buffer = this.generatePinkNoise();
                break;
            case 'brown':
                source.buffer = this.generateBrownNoise();
                break;
            case 'rain':
            case 'ocean':
            case 'forest':
            case 'chanting':
            case 'fire':
            case 'seagulls':
            case 'waves':
            case 'chanting_sutras':
            case 'guzheng':
            case 'piano':
                // 对于环境音效，直接加载音频文件，不设置默认buffer
                this.loadAudioFile(noiseType, source);
                break;
            default:
                source.buffer = this.generateWhiteNoise();
        }
        
        // 设置循环播放
        source.loop = true;
        
        return source;
    }
    
    // 生成白噪声
    generateWhiteNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1; // -1 到 1 之间的随机数
            }
        }
        
        return buffer;
    }
    
    // 生成粉噪声
    generatePinkNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        // 使用Voss-McCartney算法生成粉噪声
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
            
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = b0 = 0.99886 * b0 + white * 0.0555179;
                data[i] += b1 = 0.99332 * b1 + white * 0.0750759;
                data[i] += b2 = 0.96900 * b2 + white * 0.1538520;
                data[i] += b3 = 0.86650 * b3 + white * 0.3104856;
                data[i] += b4 = 0.55000 * b4 + white * 0.5329522;
                data[i] += b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] *= 0.11; // 缩放以避免过大振幅
            }
        }
        
        return buffer;
    }
    
    // 生成棕噪声
    generateBrownNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            let lastOut = 0.0;
            
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5; // 缩放以增加音量
            }
        }
        
        return buffer;
    }
    
    // 尝试加载音频文件
    loadAudioFile(noiseType, source) {
        const request = new XMLHttpRequest();
        request.open('GET', `sounds/${noiseType}.mp3`, true);
        request.responseType = 'arraybuffer';
        
        // 记录源的唯一ID，避免引用问题
        const sourceId = Date.now() + '_' + Math.random();
        source._loadId = sourceId;
        
        request.onload = () => {
            this.audioContext.decodeAudioData(request.response, (buffer) => {
                // 检查当前噪声源是否还是我们要更新的那个
                if (this.noiseSources[noiseType] && this.noiseSources[noiseType]._loadId === sourceId) {
                    try {
                        // 停止当前的噪声源
                        source.stop();
                    } catch (e) {
                        // 忽略已停止的错误
                    }
                    
                    // 创建新的噪声源来使用加载的buffer
                    const newSource = this.audioContext.createBufferSource();
                    newSource.buffer = buffer;
                    newSource.loop = true;
                    
                    // 连接到现有的增益节点
                    if (this.noiseGains[noiseType]) {
                        newSource.connect(this.noiseGains[noiseType]);
                        
                        // 启动新的噪声源
                        newSource.start();
                        
                        // 更新噪声源引用
                        this.noiseSources[noiseType] = newSource;
                        
                        console.log('成功加载并切换到音频文件:', noiseType);
                    }
                } else {
                    console.log('噪声源已变化，跳过音频文件加载:', noiseType);
                }
            }, (error) => {
                console.error('加载音频文件失败:', noiseType, error);
                this.showAudioFileError(noiseType);
            });
        };
        
        request.onerror = () => {
            console.warn('无法加载音频文件:', noiseType);
            this.showAudioFileError(noiseType);
        };
        
        request.send();
    }
    
    // 加载环境音效
    loadAmbientSound(noiseType) {
        const request = new XMLHttpRequest();
        request.open('GET', `sounds/${noiseType}.mp3`, true);
        request.responseType = 'arraybuffer';
        
        request.onload = () => {
            this.audioContext.decodeAudioData(request.response, (buffer) => {
                // 创建噪声源
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                
                // 连接到已创建的增益节点
                if (this.noiseGains[noiseType]) {
                    source.connect(this.noiseGains[noiseType]);
                    
                    // 启动噪声源
                    source.start();
                    
                    // 保存噪声源引用
                    this.noiseSources[noiseType] = source;
                    
                    console.log('成功加载并播放环境音效:', noiseType);
                }
            }, (error) => {
                console.error('加载环境音效失败:', noiseType, error);
                this.showAudioFileError(noiseType);
            });
        };
        
        request.onerror = () => {
            console.warn('无法加载环境音效:', noiseType);
            this.showAudioFileError(noiseType);
        };
        
        request.send();
    }
    
    // 显示音频文件错误提示
    showAudioFileError(noiseType) {
        // 停止当前噪声源
        this.stopNoise(noiseType);
        
        // 显示错误提示
        const noiseNames = {
            'rain': '雨声',
            'ocean': '海水声',
            'forest': '森林声',
            'chanting': '颂钵声',
            'fire': '篝火声',
            'seagulls': '海鸥声',
            'waves': '海浪声'
        };
        
        const noiseName = noiseNames[noiseType] || noiseType;
        
        // 创建提示元素
        const notification = document.createElement('div');
        notification.className = 'audio-error-notification';
        //notification.textContent = `无法加载${noiseName}音频文件，请检查sounds文件夹中是否存在${noiseType}.mp3文件`;
        notification.textContent = `网络问题，${noiseName}音频加载失败！重新打开该应用即可解决！`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ff6b6b;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 80%;
            text-align: center;
            font-size: 14px;
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        // 重置UI状态
        const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
        const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
        const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
        
        if (playBtn) {
            playBtn.classList.remove('active');
            playBtn.textContent = '播放';
        }
        
        if (volumeSlider) {
            volumeSlider.value = 0;
        }
        
        if (volumeValue) {
            volumeValue.textContent = '0%';
        }
        
        // 通知app.js更新状态
        if (window.sleepBoxApp) {
            delete window.sleepBoxApp.state.activeNoises[noiseType];
        }
    }
    
    // 设置定时器
    setTimer(minutes) {
        // 清除已存在的定时器
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        // 如果设置为0，关闭定时器
        if (minutes === 0) {
            this.timer = null;
            this.timerEndTime = null;
            return null;
        }
        
        const milliseconds = minutes * 60 * 1000;
        this.timerEndTime = Date.now() + milliseconds;
        
        // 如果启用了淡出功能，并且定时器设置的时间足够长（至少大于淡出时长）
        if (this.fadeOutEnabled && this.masterGain && milliseconds > this.fadeOutDuration * 1000) {
            // 计算淡出开始时间（总时间减去淡出时长）
            const fadeOutDelay = milliseconds - (this.fadeOutDuration * 1000);
            
            // 设置淡出定时器
            this.fadeOutTimer = setTimeout(() => {
                if (this.playing && this.masterGain) {
                    // 获取精确的当前时间
                    const now = this.audioContext.currentTime;
                    
                    // 记录当前音量
                    const currentVolume = this.masterGain.gain.value;
                    
                    // 开始淡出效果，使用平滑的线性过渡
                    this.masterGain.gain.setValueAtTime(currentVolume, now);
                    this.masterGain.gain.linearRampToValueAtTime(0, now + this.fadeOutDuration);
                    
                    console.log(`开始淡出效果，持续${this.fadeOutDuration}秒`);
                }
            }, fadeOutDelay);
        }
        
        this.timer = setTimeout(() => {
            // 清除淡出定时器（如果还在运行）
            if (this.fadeOutTimer) {
                clearTimeout(this.fadeOutTimer);
                this.fadeOutTimer = null;
            }
            
            this.stop();
            console.log('定时器到期，停止播放');
        }, milliseconds);
        
        console.log('设置定时器:', minutes, '分钟');
        return this.timerEndTime;
    }
    
    // 获取剩余时间（毫秒）
    getRemainingTime() {
        if (!this.timerEndTime) return null;
        const remaining = this.timerEndTime - Date.now();
        return remaining > 0 ? remaining : null;
    }
    
    // 设置淡入时长（秒）
    setFadeInDuration(seconds) {
        // 验证输入参数，确保为正数
        if (typeof seconds === 'number' && seconds > 0) {
            this.fadeInDuration = seconds;
            console.log(`淡入时长已设置为${seconds}秒`);
            return true;
        }
        console.warn('无效的淡入时长参数，必须为正数');
        return false;
    }
    
    // 设置淡出时长（秒）
    setFadeOutDuration(seconds) {
        // 验证输入参数，确保为正数
        if (typeof seconds === 'number' && seconds > 0) {
            this.fadeOutDuration = seconds;
            console.log(`淡出时长已设置为${seconds}秒`);
            return true;
        }
        console.warn('无效的淡出时长参数，必须为正数');
        return false;
    }
    
    // 启用或禁用淡入效果
    enableFadeIn(enable) {
        this.fadeInEnabled = !!enable;
        console.log(`淡入效果已${this.fadeInEnabled ? '启用' : '禁用'}`);
        return true;
    }
    
    // 启用或禁用淡出效果
    enableFadeOut(enable) {
        this.fadeOutEnabled = !!enable;
        console.log(`淡出效果已${this.fadeOutEnabled ? '启用' : '禁用'}`);
        return true;
    }
    
    // 获取当前淡入淡出配置
    getFadeSettings() {
        return {
            fadeInDuration: this.fadeInDuration,
            fadeOutDuration: this.fadeOutDuration,
            fadeInEnabled: this.fadeInEnabled,
            fadeOutEnabled: this.fadeOutEnabled
        };
    }
    
    // 保存设置到localStorage
    saveSettings(settings) {
        try {
            localStorage.setItem('sleepBoxSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }
    
    // 从localStorage加载设置
    loadSettings() {
        try {
            const settings = localStorage.getItem('sleepBoxSettings');
            return settings ? JSON.parse(settings) : null;
        } catch (error) {
            console.error('加载设置失败:', error);
            return null;
        }
    }
}

// 创建音频引擎实例
const audioEngine = new AudioEngine();

// 导出音频引擎
window.audioEngine = audioEngine;