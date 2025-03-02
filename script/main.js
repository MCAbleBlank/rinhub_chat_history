// 全局状态管理
const state = {
    currentUser: null,
    currentChatHistory: null,
    currentHistoryFile: null
};

// 聊天记录加载器
class ChatLoader {
    static async loadChatHistory(filename) {
        try {
            const response = await fetch(`history/${filename}`);
            return await response.json();
        } catch (error) {
            console.error('加载聊天记录失败:', error);
            return null;
        }
    }

    static async loadChatList() {
        try {
            const response = await fetch('./history/list.json');
            const data = await response.json();
            return data.records;
        } catch (error) {
            console.error('加载聊天记录列表失败:', error);
            return [];
        }
    }
}

// 视图渲染器
class ViewRenderer {
    static updateHeader(title, date) {
        document.querySelector('.chat-header h2').textContent = title || '(∪.∪ )...zzz';
        document.querySelector('.chat-info').textContent = date || '';
    }

    static updateIdentitySelector(participants, currentUser) {
        const select = document.getElementById('identitySelect');
        const optionsContainer = select.querySelector('.dropdown-options');
        const selectedText = select.querySelector('.selected-text');
        
        optionsContainer.innerHTML = '';
        selectedText.textContent = currentUser || '选择用户';
        
        Object.values(participants).forEach(participant => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            if (participant.nick_name === currentUser) {
                option.classList.add('selected');
            }
            option.textContent = participant.nick_name;
            option.addEventListener('click', () => {
                selectedText.textContent = participant.nick_name;
                ChatController.switchUserPerspective(participant.nick_name);
                select.classList.remove('active');
            });
            optionsContainer.appendChild(option);
        });
    }

    static renderChatList(records) {
        const menuContent = document.querySelector('.menu-content');
        menuContent.innerHTML = '<h3 style="margin-bottom: 15px;">聊天记录列表</h3>';
        
        records.forEach(record => {
            const recordDiv = document.createElement('div');
            recordDiv.className = 'chat-record-item';
            recordDiv.innerHTML = `
                ${record.icon ? 
                    `<div class="record-icon"><img src="${record.icon}" alt="${record.title}"></div>` : 
                    `<div class="record-icon default">@</div>`
                }
                <div class="record-content">
                    <div class="record-title">${record.title}</div>
                    <div class="record-date">${record.date}</div>
                </div>
            `;
            recordDiv.addEventListener('click', () => {
                ChatController.loadNewChat(record.file);
                // 关闭移动端侧边栏
                document.getElementById('menuIcon').classList.remove('active');
                document.getElementById('sideMenu').classList.remove('active');
            });
            menuContent.appendChild(recordDiv);
        });
    }

    static showError(filename) {
        const messagesContainer = document.querySelector('.chat-messages');
        messagesContainer.innerHTML = `
            <div class="initial-prompt-warning">
                <div class="prompt-content">
                    <h3>🚨聊天记录[${filename}]加载失败🚨</h3>
                </div>
            </div>
        `;
        this.updateHeader('出错啦{{{(>_<)}}}', '');
    }

    static showInitialPrompt() {
        const messagesContainer = document.querySelector('.chat-messages');
        messagesContainer.innerHTML = `
            <div class="initial-prompt">
                <div class="prompt-content">
                    <h3>⚠️您还没选择聊天记录⚠️</h3>
                    <p>请点击左上角菜单选择需要查看的聊天记录</p>
                </div>
            </div>
        `;
        this.updateHeader('(∪.∪ )...zzz', '');
    }
}

// 聊天控制器
class ChatController {
    static async initialize() {
        ViewRenderer.showInitialPrompt();
        const records = await ChatLoader.loadChatList();
        ViewRenderer.renderChatList(records);
    }

    static async loadNewChat(filename) {
        state.currentHistoryFile = filename;
        const chatData = await ChatLoader.loadChatHistory(filename);
        
        if (!chatData) {
            ViewRenderer.showError(filename);
            return;
        }

        state.currentChatHistory = chatData;
        
        // 每次加载新聊天记录时，总是使用第一个参与者作为当前用户
        if (chatData.participants) {
            state.currentUser = Object.values(chatData.participants)[0].nick_name;
        }

        ViewRenderer.updateHeader(chatData.title, chatData.date);
        ViewRenderer.updateIdentitySelector(chatData.participants, state.currentUser);
        MessageRenderer.renderMessages(chatData.messages, state.currentUser);
    }

    static async switchUserPerspective(newUser) {
        state.currentUser = newUser;
        if (state.currentChatHistory) {
            ViewRenderer.updateIdentitySelector(state.currentChatHistory.participants, newUser);
            MessageRenderer.renderMessages(state.currentChatHistory.messages, newUser);
        }
    }
}

// 消息渲染器
class MessageRenderer {
    static renderMessages(messages, currentUser) {
        const messagesContainer = document.querySelector('.chat-messages');
        messagesContainer.innerHTML = '';
        
        messages.forEach((msg, index) => {
            if (!this.validateMessage(msg, messages, index)) {
                this.renderErrorMessage(messagesContainer, msg);
                return;
            }
            
            const messageElement = this.createMessageElement(msg, messages, index, currentUser);
            messagesContainer.appendChild(messageElement);
        });
    }

    static validateMessage(msg, messages, index) {
        // 检查引用
        if (msg.content.quote) {
            // 检查引用的消息是否存在且在当前消息之前
            const quotedMsgIndex = messages.findIndex(m => m.id === msg.content.quote);
            if (quotedMsgIndex === -1 || quotedMsgIndex >= index) {
                return false;
            }
        }

        // 检查 sticker
        if (msg.content.sticker) {
            // 如果有 sticker，则除了 quote 外不能有其他内容
            const contentTypes = Object.keys(msg.content);
            const allowedTypes = contentTypes.filter(type => type !== 'quote');
            if (allowedTypes.length > 1) {
                return false;
            }
        }

        return true;
    }

    static renderErrorMessage(container, msg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message error-centered';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="text-container">
                    <div class="text">⚠️ID=${msg.id}的消息格式出现错误，请检查聊天记录文件⚠️</div>
                </div>
            </div>
        `;
        container.appendChild(messageDiv);
    }

    static createMessageElement(msg, messages, index, currentUser) {
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
        
        // 确定消息类型（发送/接收）
        const messageType = msg.sender === currentUser ? 'sent' : 'received';
        
        // 确定消息位置
        let position = 'single';
        if (prevMsg && nextMsg && msg.sender === prevMsg.sender && msg.sender === nextMsg.sender) {
            position = 'middle';
        } else if (nextMsg && msg.sender === nextMsg.sender) {
            position = 'first';
        } else if (prevMsg && msg.sender === prevMsg.sender) {
            position = 'last';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageType} ${position}`;
        
        let messageHTML = '';
        
        // 获取头像URL（从当前聊天记录的参与者信息中获取）
        const senderInfo = Object.values(state.currentChatHistory.participants)
            .find(p => p.nick_name === msg.sender);
        const avatarUrl = senderInfo ? senderInfo.avatar : '';
        
        // 添加头像
        if (messageType === 'received' && (position === 'first' || position === 'single')) {
            messageHTML += `
                <div class="avatar">
                    <img src="${avatarUrl}" alt="头像">
                </div>
            `;
        }
        
        // 开始构建消息内容
        messageHTML += '<div class="message-content">';
        
        // 添加发送者名称
        if ((position === 'first' || position === 'single') && messageType === 'received') {
            messageHTML += `<div class="sender">${msg.sender}</div>`;
        }
        
        // 添加引用（如果存在）
        if (msg.content.quote) {
            const quotedMsg = messages.find(m => m.id === msg.content.quote);
            const quotedContent = quotedMsg.content.text || '图片/表情';
            const displayContent = quotedContent.length > 15 ? 
                quotedContent.substring(0, 15) + '…' : 
                quotedContent;
            
            messageHTML += `
                <div class="quote-container">
                    <div class="quote-sender">${quotedMsg.sender}</div>
                    <div class="quote-content">${displayContent}</div>
                </div>
            `;
        }
        
        // 添加消息内容
        messageHTML += '<div class="text-container">';
        Object.entries(msg.content).forEach(([type, value]) => {
            switch(type) {
                case 'text':
                    messageHTML += `<div class="text">${value}</div>`;
                    break;
                case 'image':
                    messageHTML += `
                        <div class="image">
                            <img src="${value}" alt="图片" class="chat-image" onclick="openImageViewer('${value}')">
                        </div>
                    `;
                    break;
                case 'sticker':
                    messageHTML += `<div class="sticker"><img src="${value}" alt="表情"></div>`;
                    break;
                case 'quote':
                    // 已经在前面处理过了
                    break;
            }
        });
        messageHTML += '</div>';
        
        // 添加时间
        messageHTML += `<div class="message-time">${msg.time}</div>`;
        
        messageHTML += '</div>';
        
        messageDiv.innerHTML = messageHTML;
        return messageDiv;
    }

    static renderCenteredErrorMessage(container, errorText) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message error-centered';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="text-container">
                    <div class="text">${errorText}</div>
                </div>
            </div>
        `;
        container.appendChild(messageDiv);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 初始化身份选择器事件
    const select = document.getElementById('identitySelect');
    select.addEventListener('click', (e) => {
        select.classList.toggle('active');
    });

    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
        if (!select.contains(e.target)) {
            select.classList.remove('active');
        }
    });

    // 初始化菜单控制
    const menuIcon = document.getElementById('menuIcon');
    const sideMenu = document.getElementById('sideMenu');
    
    menuIcon.addEventListener('click', () => {
        menuIcon.classList.toggle('active');
        sideMenu.classList.toggle('active');
    });

    // 点击菜单外部关闭菜单
    document.addEventListener('click', (e) => {
        if (!sideMenu.contains(e.target) && !menuIcon.contains(e.target)) {
            menuIcon.classList.remove('active');
            sideMenu.classList.remove('active');
        }
    });

    // 初始化应用
    ChatController.initialize();
});