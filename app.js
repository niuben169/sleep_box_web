// 应用主逻辑 - 处理UI交互和事件
class SleepBoxApp {
    constructor() {
        // 获取DOM元素
        this.masterPlayBtn = document.getElementById('masterPlayBtn');
        this.timerDisplay = document.getElementById('timerDisplay');
        
        // 噪声类型
        this.noiseTypes = ['white', 'pink', 'brown', 'rain', 'ocean', 'forest', 'chanting', 'fire', 'seagulls', 'waves', 'chanting_sutras', 'guzheng', 'piano'];
        
        // 预设场景定义
        this.presets = {
            'rainy-forest': { // 雨天森林
                rain: 60,
                forest: 40
            },
            'campfire': { // 篝火营地
                fire: 70,
                forest: 30
            },
            'beach-night': { // 海边夜晚
                ocean: 50,
                waves: 40,
                seagulls: 10
            },
            'zen-temple': { // 古寺禅意
                chanting_sutras: 70,
                chanting: 30
            },
            'peaceful-room': { // 琴茶一室
                guzheng: 60,
                piano: 40
            },
            'rainy-campfire': { // 雨夜篝火
                rain: 50,
                fire: 45
            }
        };
        
        // 应用状态
        this.state = {
            playing: false,
            activeNoises: {},
            timer: null,
            timerInterval: null,
            activePreset: null
        };
    }
    
    // 初始化应用
    init() {
        console.log('睡眠盒子应用初始化');
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 初始化UI状态
        this.updateMasterButton();
        
        // 加载保存的设置，但不恢复播放状态
        this.loadSettings(false);
    }
    
    // 绑定事件监听器
    bindEvents() {
        // 主播放/暂停按钮
        this.masterPlayBtn.addEventListener('click', () => this.togglePlayback());
        
        // 为每种噪声类型绑定事件
        this.noiseTypes.forEach(noiseType => {
            // 获取元素
            const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
            const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
            const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
            
            // 确保元素存在
            if (playBtn && volumeSlider && volumeValue) {
                // 播放按钮事件
                playBtn.addEventListener('click', () => this.toggleNoise(noiseType));
                
                // 音量滑块事件
                volumeSlider.addEventListener('input', () => {
                    // 取消预设场景选择
                    if (this.state.activePreset) {
                        this.state.activePreset = null;
                        const presetItems = document.querySelectorAll('.preset-item');
                        presetItems.forEach(item => item.classList.remove('active'));
                    }
                    
                    this.updateNoiseVolume(noiseType);
                    // 更新显示的音量值
                    volumeValue.textContent = `${volumeSlider.value}%`;
                });
            }
        });
        
        // 定时器按钮事件
        const timerButtons = document.querySelectorAll('.timer-btn');
        timerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.time);
                this.setTimer(minutes);
                
                // 更新活动状态
                timerButtons.forEach(b => b.classList.remove('active'));
                if (minutes > 0) {
                    btn.classList.add('active');
                }
            });
        });
        
        // 分类标签切换事件
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                
                // 更新标签活动状态
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // 显示对应分类的噪声列表
                const noiseLists = document.querySelectorAll('.noise-list');
                noiseLists.forEach(list => list.classList.remove('active'));
                
                const activeList = document.getElementById(category);
                if (activeList) {
                    activeList.classList.add('active');
                }
            });
        });
        
        // 预设场景点击事件
        const presetItems = document.querySelectorAll('.preset-item');
        presetItems.forEach(item => {
            item.addEventListener('click', () => {
                const presetId = item.dataset.preset;
                this.activatePreset(presetId);
                
                // 更新预设活动状态
                presetItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
        
        // 页面卸载前保存设置
        window.addEventListener('beforeunload', () => this.saveSettings());
    }
    
    // 切换播放/暂停（总开关）
    togglePlayback() {
        if (this.state.playing) {
            // 如果正在播放，点击后停止所有音频
            this.stop();
        } else {
            // 如果没有播放，点击后重新播放之前激活的噪声（如果有）
            this.play();
        }
    }
    
    // 开始播放（总开关）
    play() {
        audioEngine.start();
        this.state.playing = true;
        this.updateMasterButton();
        
        // 检查是否有活动噪声
        const hasActiveNoises = Object.entries(this.state.activeNoises).some(
            ([noiseType, volume]) => volume > 0
        );
        
        // 恢复之前激活的噪声
        for (const [noiseType, volume] of Object.entries(this.state.activeNoises)) {
            if (volume > 0) { // 只播放音量大于0的噪声
                this.playNoise(noiseType);
                this.setNoiseVolume(noiseType, volume);
            }
        }
        
    }
    
    // 停止播放（总开关）- 保持滑块位置但停止播放
    stop() {
        // 只停止音频引擎，不清除活动噪声状态
        audioEngine.stop();
        this.state.playing = false;
        this.updateMasterButton();
        
        // 清除定时器显示
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
            this.timerDisplay.textContent = '未设置定时';
        }
        
        // 清除定时器按钮激活状态
        const timerButtons = document.querySelectorAll('.timer-btn');
        timerButtons.forEach(btn => btn.classList.remove('active'));
    }
    
    // 激活预设场景
    activatePreset(presetId) {
        // 检查预设是否存在
        if (!this.presets[presetId]) {
            console.warn(`预设 ${presetId} 不存在`);
            return;
        }
        
        // 停止所有当前播放的噪声
        for (const noiseType of Object.keys(this.state.activeNoises)) {
            this.stopNoise(noiseType);
        }
        
        // 重置所有滑块为0
        this.resetAllSliders();
        
        // 记录当前激活的预设
        this.state.activePreset = presetId;
        
        // 根据预设切换到对应的音效类别
        let targetCategory = 'nature'; // 默认类别
        switch (presetId) {
            case 'rainy-forest':
            case 'campfire':
                targetCategory = 'nature';
                break;
            case 'beach-night':
                targetCategory = 'ocean';
                break;
            case 'zen-temple':
            case 'peaceful-room':
                targetCategory = 'zen';
                break;
        }
        
        // 切换到对应类别
        const categoryTabs = document.querySelectorAll('.category-tab');
        const noiseLists = document.querySelectorAll('.noise-list');
        
        categoryTabs.forEach(tab => {
            if (tab.dataset.category === targetCategory) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        noiseLists.forEach(list => {
            if (list.id === targetCategory) {
                list.classList.add('active');
            } else {
                list.classList.remove('active');
            }
        });
        
        // 应用预设设置
        const preset = this.presets[presetId];
        
        // 确保应用处于播放状态
        if (!this.state.playing) {
            this.play();
        }
        
        // 设置预设中的噪声
        for (const [noiseType, volume] of Object.entries(preset)) {
            // 更新滑块值和显示
            const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
            const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
            const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
            
            if (volumeSlider && volumeValue && playBtn) {
                volumeSlider.value = volume;
                volumeValue.textContent = `${volume}%`;
                
                // 更新UI状态
                playBtn.classList.add('active');
                playBtn.textContent = '暂停';
                
                // 播放噪声并设置音量
                this.playNoise(noiseType);
                this.setNoiseVolume(noiseType, volume);
            }
        }
    }
    
    // 重置所有滑块为0
    resetAllSliders() {
        this.noiseTypes.forEach(noiseType => {
            const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
            const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
            
            if (volumeSlider && volumeValue) {
                volumeSlider.value = 0;
                volumeValue.textContent = '0%';
            }
        });
    }
    
    // 更新主播放按钮状态
    updateMasterButton() {
        if (this.state.playing) {
            this.masterPlayBtn.textContent = '⏸️ 暂停播放';
            this.masterPlayBtn.classList.add('active');
        } else {
            this.masterPlayBtn.textContent = '▶️ 开始播放';
            this.masterPlayBtn.classList.remove('active');
        }
    }
    
    // 移除主音量控制方法
    
    // 切换噪声播放状态
    toggleNoise(noiseType) {
        const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
        const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
        const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
        
        // 检查噪声是否激活
        const isActive = this.state.activeNoises.hasOwnProperty(noiseType);
        
        if (!isActive) {
            // 如果噪声未激活 - 激活它
            // 设置默认音量为30%
            volumeSlider.value = 30;
            volumeValue.textContent = '30%';
            
            // 检查应用是否在播放，如果没有则启动
            if (!this.state.playing) {
                this.play();
            }
            
            // 直接调用播放方法和设置音量
            this.playNoise(noiseType);
            this.setNoiseVolume(noiseType, 30);
            
            // 更新UI状态
            playBtn.classList.add('active');
            playBtn.textContent = '暂停';
            
        } else {
            // 如果噪声已激活 - 停止它
            this.stopNoise(noiseType);
            
            // 更新UI状态
            playBtn.classList.remove('active');
            playBtn.textContent = '播放';
            
            // 将滑块重置为0
            volumeSlider.value = 0;
            volumeValue.textContent = '0%';
        }
    }
    
    // 播放特定噪声
    playNoise(noiseType) {
        audioEngine.playNoise(noiseType);
        this.state.activeNoises[noiseType] = 50; // 默认音量50%
    }
    
    // 停止特定噪声
    stopNoise(noiseType) {
        // 确保噪声源被完全停止，而不仅仅是设置音量为0
        audioEngine.stopNoise(noiseType);
        delete this.state.activeNoises[noiseType];
        
        // 更新UI状态 - 保持音量设置不变，只更新播放按钮状态
        const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
        
        if (playBtn) {
            playBtn.classList.remove('active');
            playBtn.textContent = '播放';
        }
    }
    
    // 设置噪声音量
    setNoiseVolume(noiseType, volume) {
        audioEngine.setNoiseVolume(noiseType, volume);
        this.state.activeNoises[noiseType] = volume;
    }
    
    // 更新噪声音量并控制播放状态
    updateNoiseVolume(noiseType) {
        const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
        const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
        const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
        
        // 添加空值检查
        if (!volumeSlider || !volumeValue || !playBtn) {
            console.warn(`无法找到噪声类型 ${noiseType} 的UI元素`);
            return;
        }
        
        const volume = parseInt(volumeSlider.value);
        volumeValue.textContent = `${volume}%`;
        
        // 检查是否有噪声被激活
        const isNoiseActive = this.state.activeNoises.hasOwnProperty(noiseType);
        
        if (volume > 0 && !isNoiseActive) {
            // 音量>0但噪声未激活 - 启动噪声
            if (!this.state.playing) {
                this.play();
            }
            
            this.playNoise(noiseType);
            this.setNoiseVolume(noiseType, volume);
            
            // 更新UI状态
            playBtn.classList.add('active');
            playBtn.textContent = '暂停';
            
        } else if (volume === 0 && isNoiseActive) {
            // 音量=0但噪声激活 - 停止噪声源
            this.stopNoise(noiseType);
            
            // 更新UI状态
            playBtn.classList.remove('active');
            playBtn.textContent = '播放';
            
        } else if (volume > 0 && isNoiseActive) {
            // 音量>0且噪声激活 - 只更新音量
            this.setNoiseVolume(noiseType, volume);
        }
        
        // 如果没有活动的噪声，将主按钮设置为开始播放状态
        if (Object.keys(this.state.activeNoises).length === 0) {
            this.state.playing = false;
            this.updateMasterButton();
        } else {
            // 有活动噪声，将主按钮设置为暂停状态
            this.state.playing = true;
            this.updateMasterButton();
        }
    }
    
    // 设置定时器
    setTimer(minutes) {
        const endTime = audioEngine.setTimer(minutes);
        this.state.timer = endTime;
        
        // 清除之前的定时器更新
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
        }
        
        // 如果设置了定时器，更新显示
        if (endTime) {
            this.updateTimerDisplay();
            this.state.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
        } else {
            this.timerDisplay.textContent = '未设置定时';
        }
    }
    
    // 更新定时器显示
    updateTimerDisplay() {
        const remainingMs = audioEngine.getRemainingTime();
        
        if (!remainingMs) {
            // 定时器结束或不存在
            if (this.state.timerInterval) {
                clearInterval(this.state.timerInterval);
                this.state.timerInterval = null;
            }
            this.timerDisplay.textContent = '未设置定时';
            
            // 清除定时器按钮激活状态
            const timerButtons = document.querySelectorAll('.timer-btn');
            timerButtons.forEach(btn => btn.classList.remove('active'));
            
            return;
        }
        
        // 计算剩余时间
        const totalSeconds = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        // 格式化显示
        this.timerDisplay.textContent = `将在 ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} 后停止`;
    }
    
    // 保存设置
    saveSettings() {
        const settings = {
            activeNoises: this.state.activeNoises,
            lastUpdated: Date.now()
        };
        
        audioEngine.saveSettings(settings);
        console.log('设置已保存');
    }
    
    // 加载设置
    loadSettings() {
        // 不恢复任何保存的噪声设置，确保所有滑块位置为0
        
        // 重置所有噪声滑块为0
        this.noiseTypes.forEach(noiseType => {
            const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
            const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
            const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
            
            if (volumeSlider && volumeValue) {
                volumeSlider.value = 0;
                volumeValue.textContent = '0%';
            }
            
            if (playBtn) {
                playBtn.classList.remove('active');
                playBtn.textContent = '播放';
            }
        });
        
        // 清空活动噪声状态
        this.state.activeNoises = {};
        
        console.log('设置已重置，所有滑块位置为0');
        
        // 网页加载时自动选择雨天森林预设场景UI，但不自动播放
        setTimeout(() => {
            const presetId = 'rainy-forest';
            
            // 更新预设UI状态
            const presetItems = document.querySelectorAll('.preset-item');
            presetItems.forEach(item => {
                if (item.dataset.preset === presetId) {
                    item.classList.add('active');
                }
            });
            
            // 切换到对应的音效类别（自然类别）
            const categoryTabs = document.querySelectorAll('.category-tab');
            const noiseLists = document.querySelectorAll('.noise-list');
            
            categoryTabs.forEach(tab => {
                if (tab.dataset.category === 'nature') {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            noiseLists.forEach(list => {
                if (list.id === 'nature') {
                    list.classList.add('active');
                } else {
                    list.classList.remove('active');
                }
            });
            
            // 保存预设配置到activeNoises状态中，但不实际播放
            const preset = this.presets[presetId];
            if (preset) {
                // 记录当前激活的预设
                this.state.activePreset = presetId;
                
                // 为预设中的噪声设置音量值并更新UI滑块，但不播放
                for (const [noiseType, volume] of Object.entries(preset)) {
                    // 更新滑块值和显示
                    const volumeSlider = document.querySelector(`.volume-slider[data-noise="${noiseType}"]`);
                    const volumeValue = document.querySelector(`.noise-item[data-noise="${noiseType}"] .volume-value`);
                    const playBtn = document.querySelector(`.play-btn[data-noise="${noiseType}"]`);
                    
                    if (volumeSlider && volumeValue && playBtn) {
                        volumeSlider.value = volume;
                        volumeValue.textContent = `${volume}%`;
                        
                        // 将音量设置保存到状态中，但不实际播放
                        this.state.activeNoises[noiseType] = volume;
                    }
                }
            }
        }, 100);
    }
}

// 移除重复的DOM加载监听器，因为我们在HTML中已经有了初始化代码