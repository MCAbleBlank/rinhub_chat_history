// 截图功能模块
class ScreenshotManager {
    constructor() {
        this.isSelectMode = false;
        this.selectedMessages = new Set();
        this.init();
    }

    init() {
        // 创建选择模式按钮
        this.createSelectModeButton();
        // 创建底部操作栏
        this.createBottomToolbar();
        // 加载 html2canvas
        this.loadHtml2Canvas();
    }

    loadHtml2Canvas() {
        if (!window.html2canvas) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            document.head.appendChild(script);
        }
    }

    createSelectModeButton() {
        const header = document.querySelector('.chat-header');
        const selector = document.querySelector('.identity-selector');

        const selectBtn = document.createElement('button');
        selectBtn.id = 'selectModeBtn';
        selectBtn.className = 'select-mode-btn';
        selectBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                <path d="M18 9l-1.4-1.4-6.6 6.6-2.6-2.6L6 13l4 4z"/>
            </svg>
        `;
        selectBtn.title = '选择消息截图';
        selectBtn.addEventListener('click', () => this.toggleSelectMode());

        header.insertBefore(selectBtn, selector);
    }

    createBottomToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'screenshotToolbar';
        toolbar.className = 'screenshot-toolbar';
        toolbar.innerHTML = `
            <div class="toolbar-left">
                <span class="selected-count">已选择 <span id="selectedCount">0</span> 条消息</span>
            </div>
            <div class="toolbar-right">
                <button id="selectAllBtn" class="toolbar-btn">全选</button>
                <button id="clearSelectBtn" class="toolbar-btn secondary">清空</button>
                <button id="captureBtn" class="toolbar-btn primary">生成图片</button>
            </div>
        `;

        document.body.appendChild(toolbar);

        // 绑定事件
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        document.getElementById('clearSelectBtn').addEventListener('click', () => this.clearSelection());
        document.getElementById('captureBtn').addEventListener('click', () => this.captureMessages());
    }

    toggleSelectMode() {
        this.isSelectMode = !this.isSelectMode;
        const btn = document.getElementById('selectModeBtn');
        const toolbar = document.getElementById('screenshotToolbar');
        const messagesContainer = document.getElementById('chatMessages');

        btn.classList.toggle('active', this.isSelectMode);
        toolbar.classList.toggle('active', this.isSelectMode);
        messagesContainer.classList.toggle('select-mode', this.isSelectMode);

        if (!this.isSelectMode) {
            this.clearSelection();
        } else {
            // 添加消息点击事件
            this.bindMessageClickEvents();
        }
    }

    bindMessageClickEvents() {
        const messages = document.querySelectorAll('.chat-messages .message:not(.error-centered)');
        messages.forEach((msg, index) => {
            // 移除旧的事件监听器
            const newMsg = msg.cloneNode(true);
            msg.parentNode.replaceChild(newMsg, msg);

            newMsg.addEventListener('click', (e) => {
                if (!this.isSelectMode) return;
                e.preventDefault();
                e.stopPropagation();
                this.toggleMessageSelection(newMsg, index);
            });
        });
    }

    toggleMessageSelection(messageEl, index) {
        if (this.selectedMessages.has(index)) {
            this.selectedMessages.delete(index);
            messageEl.classList.remove('selected-for-screenshot');
        } else {
            this.selectedMessages.add(index);
            messageEl.classList.add('selected-for-screenshot');
        }
        this.updateSelectedCount();
    }

    selectAll() {
        const messages = document.querySelectorAll('.chat-messages .message:not(.error-centered)');
        messages.forEach((msg, index) => {
            this.selectedMessages.add(index);
            msg.classList.add('selected-for-screenshot');
        });
        this.updateSelectedCount();
    }

    clearSelection() {
        const messages = document.querySelectorAll('.chat-messages .message');
        messages.forEach(msg => {
            msg.classList.remove('selected-for-screenshot');
        });
        this.selectedMessages.clear();
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        document.getElementById('selectedCount').textContent = this.selectedMessages.size;
    }

    async captureMessages() {
        if (this.selectedMessages.size === 0) {
            this.showToast('请先选择要截图的消息');
            return;
        }

        if (!window.html2canvas) {
            this.showToast('图片生成组件加载中，请稍后重试');
            return;
        }

        // 显示加载状态
        this.showLoading(true);

        try {
            // 创建渲染容器
            const renderContainer = document.createElement('div');
            renderContainer.className = 'screenshot-render-container';

            // 获取由于截图特定设置的背景色
            const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--screenshot-bg').trim() || '#2b2d31';
            renderContainer.style.backgroundColor = bgColor;
            
            // 为了避免以前留下的透明遗留问题，去掉之前的 backgroundImage 逻辑
            renderContainer.style.backgroundImage = 'none';

            // 添加标题
            const titleDiv = document.createElement('div');
            titleDiv.className = 'screenshot-header';
            const chatTitle = document.querySelector('.chat-header h2').textContent;
            const chatDate = document.querySelector('.chat-info').textContent;
            titleDiv.innerHTML = `
                <div class="screenshot-title">${chatTitle}</div>
                <div class="screenshot-date">${chatDate}</div>
            `;
            renderContainer.appendChild(titleDiv);

            // 收集选中的消息并排序
            const sortedIndices = Array.from(this.selectedMessages).sort((a, b) => a - b);
            const messages = document.querySelectorAll('.chat-messages .message:not(.error-centered)');

            // 收集克隆的消息和它们的发送者信息
            const clonedMessages = [];
            sortedIndices.forEach(index => {
                const msg = messages[index];
                if (msg) {
                    const clone = msg.cloneNode(true);
                    clone.classList.remove('selected-for-screenshot');

                    // 获取发送者类型
                    const isSent = msg.classList.contains('sent');
                    const senderName = msg.getAttribute('data-sender') || '';

                    // 移除原有的位置类
                    clone.classList.remove('first', 'middle', 'last', 'single');

                    // 移除动画相关样式
                    const content = clone.querySelector('.message-content');
                    if (content) {
                        content.style.opacity = '1';
                        content.style.transform = 'none';
                        content.style.animation = 'none';
                        content.style.margin = '0';
                    }

                    // 确保头像正确显示
                    const avatar = clone.querySelector('.avatar');
                    if (avatar) {
                        avatar.style.flexShrink = '0';
                    }

                    clonedMessages.push({
                        element: clone,
                        isSent: isSent,
                        senderName: senderName
                    });
                }
            });

            // 重新计算消息位置类
            clonedMessages.forEach((msg, index) => {
                const prevMsg = index > 0 ? clonedMessages[index - 1] : null;
                const nextMsg = index < clonedMessages.length - 1 ? clonedMessages[index + 1] : null;

                const sameSenderAsPrev = prevMsg && prevMsg.senderName === msg.senderName;
                const sameSenderAsNext = nextMsg && nextMsg.senderName === msg.senderName;

                let position = 'single';
                if (sameSenderAsPrev && sameSenderAsNext) {
                    position = 'middle';
                } else if (sameSenderAsNext) {
                    position = 'first';
                } else if (sameSenderAsPrev) {
                    position = 'last';
                }

                msg.element.classList.add(position);

                // 根据新位置更新头像显示
                const avatar = msg.element.querySelector('.avatar');
                if (avatar) {
                    if (position === 'middle' || position === 'last') {
                        avatar.style.display = 'none';
                    } else {
                        avatar.style.display = '';
                    }
                }

                // 根据新位置更新发送者名称显示
                const sender = msg.element.querySelector('.sender');
                if (sender) {
                    if (position === 'middle' || position === 'last') {
                        sender.style.display = 'none';
                    } else {
                        sender.style.display = '';
                    }
                }

                renderContainer.appendChild(msg.element);
            });

            // 添加到 body，设置固定宽度用于渲染
            renderContainer.style.width = '400px';
            renderContainer.style.position = 'absolute';
            renderContainer.style.left = '-9999px';
            renderContainer.style.top = '0';
            document.body.appendChild(renderContainer);

            // 等待图片加载
            await this.waitForImages(renderContainer);

            // 使用 html2canvas 生成图片
            const canvas = await html2canvas(renderContainer, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            // 移除渲染容器
            document.body.removeChild(renderContainer);

            // 显示预览
            this.showPreview(canvas);

        } catch (error) {
            console.error('截图生成失败:', error);
            this.showToast('截图生成失败，请重试');
        } finally {
            this.showLoading(false);
        }
    }

    waitForImages(container) {
        const images = container.querySelectorAll('img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });
        return Promise.all(promises);
    }

    showPreview(canvas) {
        // 创建预览模态框
        const modal = document.createElement('div');
        modal.className = 'screenshot-preview-modal';
        modal.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <span>截图预览</span>
                    <button class="preview-close">×</button>
                </div>
                <div class="preview-body">
                    <img src="${canvas.toDataURL('image/png')}" alt="截图预览">
                </div>
                <div class="preview-footer">
                    <button class="toolbar-btn secondary" id="previewCopyBtn">复制到剪贴板</button>
                    <button class="toolbar-btn primary" id="previewDownloadBtn">保存图片</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定关闭事件
        modal.querySelector('.preview-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // 复制到剪贴板
        modal.querySelector('#previewCopyBtn').addEventListener('click', async () => {
            try {
                canvas.toBlob(async (blob) => {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    this.showToast('已复制到剪贴板');
                });
            } catch (error) {
                this.showToast('复制失败，请手动保存');
            }
        });

        // 下载图片
        modal.querySelector('#previewDownloadBtn').addEventListener('click', () => {
            const link = document.createElement('a');
            const chatTitle = document.querySelector('.chat-header h2').textContent.trim();
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            // 清理文件名中的非法字符
            const cleanTitle = chatTitle.replace(/[\\/:*?"<>|]/g, '_');
            link.download = `${cleanTitle}-${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            this.showToast('图片已保存');
        });
    }

    showLoading(show) {
        let loader = document.getElementById('screenshotLoader');
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'screenshotLoader';
                loader.className = 'screenshot-loader';
                loader.innerHTML = `
                    <div class="loader-spinner"></div>
                    <span>正在生成图片...</span>
                `;
                document.body.appendChild(loader);
            }
            loader.classList.add('active');
        } else if (loader) {
            loader.classList.remove('active');
        }
    }

    showToast(message) {
        // 移除现有的 toast
        const existingToast = document.querySelector('.screenshot-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'screenshot-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// 初始化截图管理器
document.addEventListener('DOMContentLoaded', () => {
    window.screenshotManager = new ScreenshotManager();
});
