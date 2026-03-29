/**
 * SettingsManager - 主题自定义管理器
 * 负责管理用户设置、持久化存储和UI交互
 */
class SettingsManager {
    constructor() {
        this.defaults = {
            primaryColor: '#9773de',
            bgImage: "url('../image/bg/city.png')",
            bgBlur: 0,
            overlayColor: '#000000',
            overlayOpacity: 40 // %
        };

        this.settings = this.loadSettings();
        this.init();
    }

    // 初始化
    init() {
        this.applySettings();
        this.createSettingsBtn();
        this.createSettingsModal();
        this.bindEvents();
    }

    // 加载设置
    loadSettings() {
        const saved = localStorage.getItem('chatSettings');
        return saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
    }

    // 保存设置
    saveSettings() {
        localStorage.setItem('chatSettings', JSON.stringify(this.settings));
    }

    // 应用设置到 CSS 变量
    applySettings() {
        const root = document.documentElement;

        // 应用主题色
        root.style.setProperty('--color-primary', this.settings.primaryColor);
        // 生成并应用变体颜色 (简单变暗/变亮处理)
        root.style.setProperty('--color-primary-dark', this.adjustColor(this.settings.primaryColor, -20));
        root.style.setProperty('--color-primary-light', this.adjustColor(this.settings.primaryColor, 20));

        // 应用背景图
        let bgImg = this.settings.bgImage;
        // 如果不是 url() 或 data: 开头，添加 url()
        if (!bgImg.startsWith('url(') && !bgImg.startsWith('data:')) {
            bgImg = `url('${bgImg}')`;
        }
        root.style.setProperty('--bg-image', bgImg);

        // 应用模糊
        root.style.setProperty('--bg-blur', `${this.settings.bgBlur}px`);

        // 应用遮罩 (颜色 + 透明度合成 rgba)
        const rgba = this.hexToRgba(this.settings.overlayColor, this.settings.overlayOpacity / 100);
        root.style.setProperty('--bg-overlay', rgba);
    }

    // 创建设置入口按钮
    createSettingsBtn() {
        const sideMenu = document.querySelector('.side-menu');
        if (!sideMenu) return;

        const container = document.createElement('div');
        container.className = 'settings-btn-container';

        const btn = document.createElement('button');
        btn.className = 'settings-btn';
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
            </svg>
            主题设置
        `;

        btn.onclick = () => this.toggleModal(true);
        container.appendChild(btn);
        sideMenu.appendChild(container); // 添加到侧边栏底部
    }

    // 创建设置模态框
    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.id = 'settingsModal';

        modal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h3>个性化设置</h3>
                    <button class="close-settings" id="closeSettings">×</button>
                </div>
                <div class="settings-body">
                    <!-- 主题色 -->
                    <div class="settings-group">
                        <h4>主题风格</h4>
                        <div class="setting-item">
                            <div class="setting-label">
                                <span>主题颜色</span>
                                <span class="setting-value" id="primaryColorValue">${this.settings.primaryColor}</span>
                            </div>
                            <div class="color-picker-container">
                                <input type="color" id="primaryColorInput" class="color-input" value="${this.settings.primaryColor}">
                            </div>
                        </div>
                    </div>

                    <!-- 背景设置 -->
                    <div class="settings-group">
                        <h4>背景设置</h4>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <span>背景模糊度</span>
                                <span class="setting-value" id="blurValue">${this.settings.bgBlur}px</span>
                            </div>
                            <div class="slider-container">
                                <input type="range" id="blurInput" class="slider" min="0" max="20" step="1" value="${this.settings.bgBlur}">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <span>背景遮罩颜色</span>
                            </div>
                            <div class="color-picker-container">
                                <input type="color" id="overlayColorInput" class="color-input" value="${this.settings.overlayColor}">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <span>遮罩不透明度</span>
                                <span class="setting-value" id="opacityValue">${this.settings.overlayOpacity}%</span>
                            </div>
                            <div class="slider-container">
                                <input type="range" id="opacityInput" class="slider" min="0" max="100" step="5" value="${this.settings.overlayOpacity}">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <span>自定义背景图</span>
                            </div>
                            <label class="file-upload-btn">
                                选择本地图片
                                <input type="file" id="bgFileInput" accept="image/*" style="display: none;">
                            </label>
                            <input type="text" id="bgUrlInput" class="url-input" placeholder="或输入图片 URL" value="${this.settings.bgImage.replace(/^url\(['"]?|['"]?\)$/g, '')}">
                        </div>
                    </div>
                </div>
                <div class="settings-footer">
                    <button class="toolbar-btn secondary reset-btn" id="resetSettings">恢复默认</button>
                    <button class="toolbar-btn primary" id="saveSettings">完成</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // 绑定事件
    bindEvents() {
        const modal = document.getElementById('settingsModal');

        // 关闭
        document.getElementById('closeSettings').onclick = () => this.toggleModal(false);
        document.getElementById('saveSettings').onclick = () => this.toggleModal(false);
        modal.onclick = (e) => {
            if (e.target === modal) this.toggleModal(false);
        };

        // 主题色
        const primaryInput = document.getElementById('primaryColorInput');
        primaryInput.oninput = (e) => {
            this.settings.primaryColor = e.target.value;
            document.getElementById('primaryColorValue').textContent = e.target.value;
            this.applySettings();
            this.saveSettings();
        };

        // 背景模糊
        const blurInput = document.getElementById('blurInput');
        blurInput.oninput = (e) => {
            this.settings.bgBlur = e.target.value;
            document.getElementById('blurValue').textContent = `${e.target.value}px`;
            this.applySettings();
            this.saveSettings();
        };

        // 遮罩颜色
        const overlayColorInput = document.getElementById('overlayColorInput');
        overlayColorInput.oninput = (e) => {
            this.settings.overlayColor = e.target.value;
            this.applySettings();
            this.saveSettings();
        };

        // 遮罩透明度
        const opacityInput = document.getElementById('opacityInput');
        opacityInput.oninput = (e) => {
            this.settings.overlayOpacity = e.target.value;
            document.getElementById('opacityValue').textContent = `${e.target.value}%`;
            this.applySettings();
            this.saveSettings();
        };

        // 背景 URL
        const bgUrlInput = document.getElementById('bgUrlInput');
        bgUrlInput.onchange = (e) => {
            this.settings.bgImage = `url('${e.target.value}')`;
            this.applySettings();
            this.saveSettings();
        };

        // 本地文件上传
        const bgFileInput = document.getElementById('bgFileInput');
        bgFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.settings.bgImage = `url('${e.target.result}')`;
                    document.getElementById('bgUrlInput').value = '(已选择本地图片)';
                    this.applySettings();
                    this.saveSettings();
                };
                reader.readAsDataURL(file);
            }
        };

        // 重置
        document.getElementById('resetSettings').onclick = () => {
            if (confirm('确定要恢复默认设置吗？')) {
                this.settings = { ...this.defaults };
                this.saveSettings();
                this.applySettings();
                this.updateUI();
                this.toggleModal(false);
                setTimeout(() => alert('已恢复默认设置'), 100);
            }
        };
    }

    // 更新 UI 状态
    updateUI() {
        document.getElementById('primaryColorInput').value = this.settings.primaryColor;
        document.getElementById('primaryColorValue').textContent = this.settings.primaryColor;

        document.getElementById('blurInput').value = this.settings.bgBlur;
        document.getElementById('blurValue').textContent = `${this.settings.bgBlur}px`;

        document.getElementById('overlayColorInput').value = this.settings.overlayColor;

        document.getElementById('opacityInput').value = this.settings.overlayOpacity;
        document.getElementById('opacityValue').textContent = `${this.settings.overlayOpacity}%`;

        let rawUrl = this.settings.bgImage;
        if (rawUrl.startsWith('url(')) {
            rawUrl = rawUrl.slice(4, -1); // 移除 url( 和 )
            // 移除可能的引号
            if ((rawUrl.startsWith('"') && rawUrl.endsWith('"')) || (rawUrl.startsWith("'") && rawUrl.endsWith("'"))) {
                rawUrl = rawUrl.slice(1, -1);
            }
        }
        document.getElementById('bgUrlInput').value = rawUrl.startsWith('data:') ? '(本地图片)' : rawUrl;
    }

    toggleModal(show) {
        const modal = document.getElementById('settingsModal');
        if (show) {
            this.updateUI();
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    }

    // 工具：Hex 转 RGBA
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // 工具：调整颜色亮度 (简单变暗变亮)
    adjustColor(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});
