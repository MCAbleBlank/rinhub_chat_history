let currentUser = null;

async function loadChatHistory(filename) {
    try {
        const response = await fetch(`history/${filename}`);
        const data = await response.json();
        
        // 更新选择框选项
        updateIdentitySelector(data.participants);
        
        // 如果还没有选择用户，默认选择第一个用户
        if (!currentUser) {
            const firstUser = Object.values(data.participants)[0];
            currentUser = firstUser.nick_name;
        }
        
        // 更新标题和日期
        document.querySelector('.chat-header h2').textContent = data.title;
        document.querySelector('.chat-info').textContent = data.date;
        
        renderChat(data);
    } catch (error) {
        console.error('失败:', error);
        // 清空聊天记录容器并显示错误信息
        const messagesContainer = document.querySelector('.chat-messages');
        messagesContainer.innerHTML = `
            <div class="initial-prompt-warning">
                <div class="prompt-content">
                    <h3>🚨聊天记录[${filename}]加载失败🚨</h3>
                </div>
            </div>
        `;
        document.querySelector('.chat-header h2').textContent = '出错啦{{{(>_<)}}}';
        document.querySelector('.chat-info').textContent = ''; // 清空日期显示
    }
}

function updateIdentitySelector(participants) {
    const select = document.getElementById('identitySelect');
    const optionsContainer = select.querySelector('.dropdown-options');
    const selectedText = select.querySelector('.selected-text');
    optionsContainer.innerHTML = '';
    
    // 添加所有参与者作为选项
    Object.values(participants).forEach(participant => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        if (participant.nick_name === currentUser) {
            option.classList.add('selected');
            selectedText.textContent = participant.nick_name;
        }
        option.textContent = participant.nick_name;
        option.addEventListener('click', () => {
            currentUser = participant.nick_name;
            const urlParams = new URLSearchParams(window.location.search);
            const historyFile = urlParams.get('history') || 'test2.1.json';
            loadChatHistory(historyFile);
            select.classList.remove('active');
        });
        optionsContainer.appendChild(option);
    });
}

function validateMessage(msg, messages, index) {
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

function renderChat(data) {
    const messagesContainer = document.querySelector('.chat-messages');
    messagesContainer.innerHTML = '';
    
    // 处理消息
    data.messages.forEach((msg, index) => {
        const prevMsg = index > 0 ? data.messages[index - 1] : null;
        const nextMsg = index < data.messages.length - 1 ? data.messages[index + 1] : null;
        
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
        
        // 验证消息格式
        if (!validateMessage(msg, data.messages, index)) {
            messageDiv.className = `message ${messageType} single`;
            messageHTML = `
                <div class="message-content error">
                    <div class="text-container">
                        <div class="text">⚠️ID=${msg.id}的消息格式出现错误，请检查聊天记录文件⚠️</div>
                    </div>
                </div>
            `;
            messageDiv.innerHTML = messageHTML;
            messagesContainer.appendChild(messageDiv);
            return;
        }
        
        // 获取头像URL
        const senderInfo = Object.values(data.participants).find(p => p.nick_name === msg.sender);
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
            const quotedMsg = data.messages.find(m => m.id === msg.content.quote);
            const quotedContent = quotedMsg.content.text || '图片/表情';
            // 如果引用内容超过10个字符，截取前10个字符并添加省略号
            const displayContent = quotedContent.length > 10 ? 
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
        // 按照 content 中的顺序处理内容
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
        messagesContainer.appendChild(messageDiv);
    });
}

// 添加新的函数来加载聊天记录列表
async function loadChatList() {
    try {
        const response = await fetch('./history/list.json');
        const data = await response.json();
        renderChatList(data.records);
    } catch (error) {
        console.error('加载聊天记录列表失败:', error);
    }
}

// 当前加载的记录索引
let currentRecordIndex = 0;
const recordsPerPage = 10;
let allRecords = [];

// 渲染聊天记录列表到侧边栏
function renderChatList(records) {
    const menuContent = document.querySelector('.menu-content');
    menuContent.innerHTML = '<h3 style="margin-bottom: 15px;">聊天记录列表</h3>';
    
    allRecords = records;
    loadMoreRecords();

    // 添加滚动监听
    menuContent.addEventListener('scroll', () => {
        if (menuContent.scrollHeight - menuContent.scrollTop <= menuContent.clientHeight + 100) {
            loadMoreRecords();
        }
    });
}

// 加载更多记录
function loadMoreRecords() {
    if (currentRecordIndex >= allRecords.length) return;
    
    const menuContent = document.querySelector('.menu-content');
    const recordsToLoad = allRecords.slice(currentRecordIndex, currentRecordIndex + recordsPerPage);
    
    recordsToLoad.forEach(record => {
        const recordDiv = document.createElement('div');
        recordDiv.className = 'chat-record-item';
        recordDiv.innerHTML = `
            <div class="record-title">${record.title}</div>
            <div class="record-date">${record.date}</div>
        `;
        recordDiv.addEventListener('click', () => {
            loadChatHistory(record.file);
            // 在移动设备上自动关闭侧边栏
            document.getElementById('menuIcon').classList.remove('active');
            document.getElementById('sideMenu').classList.remove('active');
        });
        menuContent.appendChild(recordDiv);
    });
    
    currentRecordIndex += recordsPerPage;
}

// 添加初始提示函数
function showInitialPrompt() {
    const messagesContainer = document.querySelector('.chat-messages');
    messagesContainer.innerHTML = `
        <div class="initial-prompt">
            <div class="prompt-content">
                <h3>⚠️您还没选择聊天记录⚠️</h3>
                <p>请点击左上角菜单选择需要查看的聊天记录</p>
            </div>
        </div>
    `;
    
    // 清空标题和日期
    document.querySelector('.chat-header h2').textContent = '(∪.∪ )...zzz';
    document.querySelector('.chat-info').textContent = '';
}

// 替换原有的事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('identitySelect');
    
    // 点击选择框时显示/隐藏选项
    select.addEventListener('click', (e) => {
        select.classList.toggle('active');
    });
    
    // 点击其他地方时关闭选项
    document.addEventListener('click', (e) => {
        if (!select.contains(e.target)) {
            select.classList.remove('active');
        }
    });

    // 添加菜单控制
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

    // 显示初始提示
    showInitialPrompt();
    
    // 加载聊天记录列表
    loadChatList();
});