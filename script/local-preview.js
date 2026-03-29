/**
 * 本地ZIP聊天记录预览功能
 */
class LocalPreviewManager {
    static init() {
        const btnPreviewZip = document.getElementById('btnPreviewZip');
        const localZipLoader = document.getElementById('localZipLoader');

        if (!btnPreviewZip || !localZipLoader) return;

        btnPreviewZip.addEventListener('click', () => {
            localZipLoader.click();
        });

        localZipLoader.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                // 清空选中以支持下次重新选择同名文件
                e.target.value = '';
                
                // 为了与加载普通记录统一效果，先展示一些通用UI
                ViewRenderer.updateHeader('读取中...', '解析本地ZIP文件');
                document.querySelector('.chat-messages').innerHTML = `
                    <div class="message error-centered">
                        <div class="message-content">
                            <div class="text-container">
                                <div class="text">🔄 正在解析ZIP并提取图片资源...</div>
                            </div>
                        </div>
                    </div>
                `;

                // 关闭可能打开的测边栏
                document.getElementById('menuIcon')?.classList.remove('active');
                document.getElementById('sideMenu')?.classList.remove('active');

                // 读取并解析ZIP
                const arrayBuffer = await file.arrayBuffer();
                const zip = await JSZip.loadAsync(arrayBuffer);
                
                // 寻找主json文件
                let jsonFile = null;
                for (const relativePath in zip.files) {
                    if (relativePath.endsWith('.json') && !relativePath.includes('/')) {
                        jsonFile = zip.files[relativePath];
                        break;
                    }
                }

                if (!jsonFile) {
                    throw new Error("在压缩包根目录未找到 .json 文件！请确保该文件在第一层级内。");
                }

                const jsonContent = await jsonFile.async('string');
                const chatData = JSON.parse(jsonContent);

                // 解析压缩包内的所有图片资源，创建 Blob URL
                const resourceRegex = /\.(png|jpg|jpeg|gif|webp)$/i;
                const pathMap = new Map(); // 存储: 'image/xxx.png' -> 'blob:...' 映射

                for (const relativePath in zip.files) {
                    const zipEntry = zip.files[relativePath];
                    if (!zipEntry.dir && resourceRegex.test(relativePath)) {
                        const fileBlob = await zipEntry.async('blob');
                        let mimeType = 'image/png';
                        if (relativePath.match(/\.jpg|\.jpeg$/i)) mimeType = 'image/jpeg';
                        else if (relativePath.match(/\.gif$/i)) mimeType = 'image/gif';
                        else if (relativePath.match(/\.webp$/i)) mimeType = 'image/webp';
                        
                        // 强制指定正确MIME类型以防意外
                        const typedBlob = new Blob([fileBlob], { type: mimeType });
                        const blobUrl = URL.createObjectURL(typedBlob);
                        
                        // 存入多种格式以便替换（如带有./前缀的，不带./前缀的）
                        const normalizedPath = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath;
                        pathMap.set(normalizedPath, blobUrl);
                        pathMap.set('./' + normalizedPath, blobUrl);
                    }
                }

                // 替换 JSON 数据中的相关资源路径为 Blob URL
                this.replacePathsWithBlobs(chatData, pathMap);

                // 转交给 ChatController 统一渲染
                ChatController.loadChatData(chatData, '本地ZIP: ' + file.name);

            } catch (err) {
                console.error("本地ZIP解析失败:", err);
                const msgErr = err.message || "未知错误";
                ViewRenderer.showError(`ZIP解析失败: ${msgErr}`);
            }
        });
    }

    /**
     * 递归遍历 JSON 中的头像、图片和表情包参数，替换为对应的 blobUrl 链接
     */
    static replacePathsWithBlobs(chatData, pathMap) {
        // 1. 替换参与者头像
        if (chatData.participants) {
            Object.values(chatData.participants).forEach(participant => {
                if (participant.avatar && pathMap.has(participant.avatar)) {
                    participant.avatar = pathMap.get(participant.avatar);
                }
            });
        }

        // 2. 替换消息中的图片/表情包
        if (chatData.messages) {
            chatData.messages.forEach(msg => {
                if (msg.content) {
                    if (msg.content.image && pathMap.has(msg.content.image)) {
                        msg.content.image = pathMap.get(msg.content.image);
                    }
                    if (msg.content.sticker && pathMap.has(msg.content.sticker)) {
                        msg.content.sticker = pathMap.get(msg.content.sticker);
                    }
                }
            });
        }
    }
}

// 确保主文档加载完毕后初始该功能
document.addEventListener('DOMContentLoaded', () => {
    LocalPreviewManager.init();
});
