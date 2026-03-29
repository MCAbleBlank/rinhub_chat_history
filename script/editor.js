/**
 * 聊天记录编辑器控制器
 */
class EditorController {
    static state = {
        title: '',
        date: '',
        participants: [], // { id, nick_name, avatarFile, avatarBlobUrl }
        messages: [] // { id, senderId, type: 'text'|'image'|'sticker', textContent, fileObj, fileBlobUrl, quote, time }
    };

    static generateId(prefix = 'id') {
        return prefix + '_' + Math.random().toString(36).substr(2, 6);
    }

    static init() {
        const btnOpenEditor = document.getElementById('btnOpenEditor');
        if (!btnOpenEditor) return;

        btnOpenEditor.addEventListener('click', () => {
            this.openEditor();
            // 关闭测边栏
            document.getElementById('menuIcon')?.classList.remove('active');
            document.getElementById('sideMenu')?.classList.remove('active');
        });
    }

    static resetState() {
        const now = new Date();
        this.state = {
            title: '新建聊天记录',
            date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日新建`,
            participants: [
                { id: this.generateId('p'), nick_name: '群友A', avatarFile: null, avatarBlobUrl: null },
                { id: this.generateId('p'), nick_name: '群友B', avatarFile: null, avatarBlobUrl: null }
            ],
            messages: []
        };
    }

    static openEditor() {
        this.resetState();
        
        // 隐藏原有的聊天记录界面
        document.getElementById('chatMessages').style.display = 'none';
        
        const container = document.getElementById('editorContainer');
        container.style.display = 'flex';
        
        // 更新顶栏
        ViewRenderer.updateHeader('编辑器模式', '正在编辑新的聊天记录 (未保存)');
        
        this.render();
    }

    static closeEditor() {
        if (!confirm('确定退出编辑器吗？未保存的内容将丢失。')) return;
        document.getElementById('editorContainer').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'block';
        ViewRenderer.showInitialPrompt();
    }

    static render() {
        const container = document.getElementById('editorContainer');
        
        container.innerHTML = `
            <div class="editor-section">
                <div class="editor-title">
                    <span>全局设置</span>
                    <button class="editor-btn danger icon-only" onclick="EditorController.closeEditor()" title="退出编辑器">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        退出
                    </button>
                </div>
                <div class="editor-row">
                    <div class="editor-input-group">
                        <label>标题</label>
                        <input type="text" class="editor-input" id="editTitle" value="${this.state.title}">
                    </div>
                    <div class="editor-input-group">
                        <label>日期显示语</label>
                        <input type="text" class="editor-input" id="editDate" value="${this.state.date}">
                    </div>
                </div>
            </div>

            <div class="editor-section">
                <div class="editor-title">
                    <span>参与者 (群友)设置</span>
                    <button class="editor-btn secondary" onclick="EditorController.addParticipant()">+ 添加参与者</button>
                </div>
                <div class="participants-list" id="participantsList">
                    <!-- 参与者列表 -->
                </div>
            </div>

            <div class="editor-section" style="flex: 1;">
                <div class="editor-title">
                    <span>消息列表设置 (建议按时间顺序添加)</span>
                    <button class="editor-btn secondary" onclick="EditorController.addMessage()">+ 添加新消息</button>
                </div>
                <div class="messages-list" id="messagesList">
                    <!-- 消息列表 -->
                </div>
            </div>

            <div class="editor-bottom-bar">
                <button class="editor-btn secondary" onclick="EditorController.addMessage()">+ 继续添加消息</button>
                <button class="editor-btn" onclick="EditorController.exportZip()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    保存并导出 ZIP
                </button>
            </div>
        `;

        // 绑定全局输入框
        document.getElementById('editTitle').oninput = (e) => this.state.title = e.target.value;
        document.getElementById('editDate').oninput = (e) => this.state.date = e.target.value;

        this.renderParticipants();
        this.renderMessages();
    }

    /* ==================================
       参与者管理
       ================================== */
    static addParticipant() {
        this.state.participants.push({
            id: this.generateId('p'),
            nick_name: '新群友',
            avatarFile: null,
            avatarBlobUrl: null
        });
        this.renderParticipants();
        this.renderMessages(); // 重新渲染消息以上下文刷新发送者下拉框
    }

    static removeParticipant(id) {
        if (this.state.participants.length <= 1) {
            alert("至少需要保留一名参与者");
            return;
        }
        this.state.participants = this.state.participants.filter(p => p.id !== id);
        this.renderParticipants();
        this.renderMessages();
    }

    static renderParticipants() {
        const list = document.getElementById('participantsList');
        list.innerHTML = '';
        
        this.state.participants.forEach((p, index) => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            
            const avatarHtml = `
                <label class="avatar-upload ${p.avatarBlobUrl ? 'has-image' : ''}">
                    <input type="file" accept="image/*" onchange="EditorController.updateParticipantAvatar('${p.id}', this.files[0])">
                    ${p.avatarBlobUrl 
                        ? `<img src="${p.avatarBlobUrl}">` 
                        : `<span class="upload-placeholder">传头像</span>`
                    }
                </label>
            `;

            item.innerHTML = `
                ${avatarHtml}
                <div class="editor-input-group" style="flex: 1; margin-bottom: 0; justify-content: center;">
                    <label>昵称</label>
                    <input type="text" class="editor-input" value="${p.nick_name}" 
                           oninput="EditorController.updateParticipantName('${p.id}', this.value)">
                </div>
                <button class="editor-btn danger icon-only" style="align-self: center;" onclick="EditorController.removeParticipant('${p.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            `;
            list.appendChild(item);
        });
    }

    static updateParticipantName(id, newName) {
        const p = this.state.participants.find(p => p.id === id);
        if (p) p.nick_name = newName;
        // 注意：不在这里调用render, 防止失去焦点
    }

    static updateParticipantAvatar(id, file) {
        if (!file) return;
        const p = this.state.participants.find(p => p.id === id);
        if (p) {
            if (p.avatarBlobUrl) URL.revokeObjectURL(p.avatarBlobUrl);
            p.avatarFile = file;
            p.avatarBlobUrl = URL.createObjectURL(file);
            this.renderParticipants();
        }
    }

    /* ==================================
       消息管理
       ================================== */
    static addMessage() {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        const senderId = this.state.participants[0]?.id || '';

        this.state.messages.push({
            id: this.generateId('msg'),
            senderId: senderId,
            type: 'text',
            textContent: '',
            fileObj: null,
            fileBlobUrl: null,
            quote: '',
            time: timeStr
        });
        this.renderMessages();
        
        // 自动滚动到底部
        setTimeout(() => {
            const container = document.getElementById('editorContainer');
            if (container) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }, 50);
    }

    static removeMessage(id) {
        this.state.messages = this.state.messages.filter(m => m.id !== id);
        this.renderMessages();
    }

    static updateMessageValue(id, field, value) {
        const m = this.state.messages.find(m => m.id === id);
        if (m) {
            m[field] = value;
            if (field === 'type') {
                this.renderMessages(); // 切换类型时需要重渲染UI
            }
        }
    }

    static updateMessageFile(id, file) {
        if (!file) return;
        const m = this.state.messages.find(m => m.id === id);
        if (m) {
            if (m.fileBlobUrl) URL.revokeObjectURL(m.fileBlobUrl);
            m.fileObj = file;
            m.fileBlobUrl = URL.createObjectURL(file);
            this.renderMessages();
        }
    }

    static renderMessages() {
        const list = document.getElementById('messagesList');
        if (!list) return; // 由于重新渲染 participants 可能会触发
        
        list.innerHTML = '';

        if (this.state.messages.length === 0) {
            list.innerHTML = '<div style="color:var(--color-text-dim); text-align:center; padding: 20px;">暂无消息，请添加消息。</div>';
            return;
        }

        const participantOptionsHtml = this.state.participants.map(p => 
            `<option value="${p.id}">${p.nick_name}</option>`
        ).join('');

        this.state.messages.forEach((msg, index) => {
            const item = document.createElement('div');
            item.className = 'message-edit-item';
            
            // 构造可选引用ID，只能引用当前消息之前的消息
            let quoteOptionsHtml = '<option value="">(无引用)</option>';
            for(let i=0; i<index; i++) {
                const prevMsg = this.state.messages[i];
                let displayTxt = prevMsg.type === 'text' ? prevMsg.textContent.substring(0, 10) : `[${prevMsg.type}]`;
                quoteOptionsHtml += `<option value="${prevMsg.id}">引用 #${i+1}: ${displayTxt}</option>`;
            }

            // 动态构建内容输入区
            let contentHtml = '';
            if (msg.type === 'text') {
                contentHtml = `
                    <textarea class="editor-textarea" placeholder="输入聊天内容..." 
                        oninput="EditorController.updateMessageValue('${msg.id}', 'textContent', this.value)">${msg.textContent}</textarea>
                `;
            } else {
                contentHtml = `
                    <div class="content-uploader">
                        <label class="editor-btn secondary">
                            选择${msg.type === 'image' ? '图片' : '表情包'}文件...
                            <input type="file" accept="image/*" style="display:none;" 
                                onchange="EditorController.updateMessageFile('${msg.id}', this.files[0])">
                        </label>
                        ${msg.fileBlobUrl ? `<div class="preview-box"><img src="${msg.fileBlobUrl}"></div>` : '<span style="color:#888;font-size:12px;">未选择文件</span>'}
                    </div>
                `;
            }

            item.innerHTML = `
                <div class="message-header">
                    <strong>#${index + 1}</strong>
                    <button class="editor-btn danger icon-only" onclick="EditorController.removeMessage('${msg.id}')">
                        移除
                    </button>
                </div>
                <div class="message-body">
                    <div class="editor-row">
                        <div class="editor-input-group" style="flex:2;">
                            <label>发送者</label>
                            <select class="editor-select" onchange="EditorController.updateMessageValue('${msg.id}', 'senderId', this.value)">
                                ${participantOptionsHtml}
                            </select>
                        </div>
                        <div class="editor-input-group" style="flex:1;">
                            <label>发送时间</label>
                            <input type="text" class="editor-input" value="${msg.time}" placeholder="HH:MM:SS"
                                oninput="EditorController.updateMessageValue('${msg.id}', 'time', this.value)">
                        </div>
                        <div class="editor-input-group" style="flex:2;">
                            <label>引用消息</label>
                            <select class="editor-select" onchange="EditorController.updateMessageValue('${msg.id}', 'quote', this.value)">
                                ${quoteOptionsHtml}
                            </select>
                        </div>
                    </div>
                    
                    <div class="editor-input-group">
                        <label>消息内容类</label>
                        <div class="message-type-selector">
                            <button class="message-type-btn ${msg.type==='text'?'active':''}" onclick="EditorController.updateMessageValue('${msg.id}', 'type', 'text')">文字</button>
                            <button class="message-type-btn ${msg.type==='image'?'active':''}" onclick="EditorController.updateMessageValue('${msg.id}', 'type', 'image')">图片</button>
                            <button class="message-type-btn ${msg.type==='sticker'?'active':''}" onclick="EditorController.updateMessageValue('${msg.id}', 'type', 'sticker')">表情包 (Sticker)</button>
                        </div>
                        ${contentHtml}
                    </div>
                </div>
            `;
            
            // 补偿下拉框的选中值
            setTimeout(() => {
                const selects = item.querySelectorAll('select');
                if (selects[0]) selects[0].value = msg.senderId;
                if (selects[1]) selects[1].value = msg.quote;
            }, 0);

            list.appendChild(item);
        });
    }

    /* ==================================
       导出功能
       ================================== */
    static async exportZip() {
        if (!JSZip || !window.saveAs) {
            alert("缺少打包库，此功能暂不可用！");
            return;
        }

        const zip = new JSZip();
        const exportJson = {
            version: "2.1",
            title: this.state.title,
            date: this.state.date,
            participants: {},
            messages: []
        };

        try {
            // 提取 Participant 图标
            for (const p of this.state.participants) {
                const partObj = {
                    nick_name: p.nick_name,
                    avatar: "" // default
                };

                if (p.avatarFile) {
                    const ext = p.avatarFile.name.split('.').pop();
                    const path = `avatar/${p.id}.${ext}`;
                    zip.file(path, p.avatarFile);
                    partObj.avatar = `./${path}`;
                }

                exportJson.participants[p.id] = partObj;
            }

            // 提取 Messages && 内容资源
            for (const msg of this.state.messages) {
                // 不再使用昵称，而是直接保存participant_id。但为了容错，如果找不到id就不填
                const senderId = msg.senderId || '';

                const msgObj = {
                    id: msg.id,
                    sender: senderId,
                    time: msg.time,
                    content: {}
                };

                if (msg.quote) {
                    msgObj.content.quote = msg.quote;
                }

                if (msg.type === 'text') {
                    if (msg.textContent.trim()) {
                        msgObj.content.text = msg.textContent;
                    } else {
                        throw new Error(`消息 #${msg.id} 是纯文字类型，但内容为空！`);
                    }
                } else if (msg.type === 'image' || msg.type === 'sticker') {
                    if (!msg.fileObj) {
                        throw new Error(`存在未上传文件的 ${msg.type} 类型气泡！`);
                    }
                    const ext = msg.fileObj.name.split('.').pop();
                    const path = `${msg.type}/${msg.id}.${ext}`;
                    zip.file(path, msg.fileObj);
                    msgObj.content[msg.type] = `./${path}`;
                }

                exportJson.messages.push(msgObj);
            }

            // 生成 JSON
            const jsonString = JSON.stringify(exportJson, null, 4);
            zip.file("history.json", jsonString);

            // 打包并保护
            const btn = document.querySelector('.editor-bottom-bar .editor-btn:last-child');
            const oldText = btn.innerHTML;
            btn.innerHTML = '打包中...';
            btn.disabled = true;

            const blob = await zip.generateAsync({ type: "blob" });
            
            // 构造动态文件名：[标题]-[日期].zip
            const rawFileName = `${this.state.title}_${this.state.date}`;
            const cleanFileName = rawFileName.replace(/[\\/:*?"<>|]/g, '_').trim();
            const finalFileName = (cleanFileName || "chat_history") + ".zip";

            window.saveAs(blob, finalFileName);

            btn.innerHTML = oldText;
            btn.disabled = false;
        } catch (err) {
            alert(`导出失败: ${err.message}`);
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    EditorController.init();
});
