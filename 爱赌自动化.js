// ==UserScript==
// @name         爱赌验证码自动识别脚本
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动识别验证码并点击坐标
// @author       You
// @match        https://yanzm.gwn81.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.jfbym.com
// ==/UserScript==

(function() {
    'use strict';

    // 配置参数
    const CONFIG = {
        token: 'gP6Ft0Sk6YlgOed4xCOhh56I35IbRkj0KswXlcOwcHQ',
        type: '88888',
        apiUrl: 'http://api.jfbym.com/api/YmServer/customApi'
    };

    // 检查是否在目标页面
    function isTargetPage() {
        const url = window.location.href;
        return url.includes('yanzm.gwn81.com') && 
               url.includes('chat_id=') && 
               url.includes('pack_id=');
    }

    // 截取元素区域为base64
    function captureElementToBase64(element) {
        return new Promise((resolve, reject) => {
            try {
                addLog(`开始截取元素: tagName=${element.tagName}, id=${element.id}`, 'info');
                
                // 检查元素是否有效
                if (!element) {
                    throw new Error('元素为空');
                }
                
                // 获取元素的位置和尺寸
                const rect = element.getBoundingClientRect();
                addLog(`元素位置: x=${rect.left}, y=${rect.top}, width=${rect.width}, height=${rect.height}`, 'info');
                
                if (rect.width === 0 || rect.height === 0) {
                    throw new Error('元素尺寸无效');
                }
                
                // 使用html2canvas截取元素
                if (typeof html2canvas === 'undefined') {
                    // 如果没有html2canvas，使用canvas手动截取
                    return captureElementManually(element, resolve, reject);
                }
                
                html2canvas(element, {
                    allowTaint: true,
                    useCORS: true,
                    scale: 1,
                    logging: false
                }).then(canvas => {
                    const base64 = canvas.toDataURL('image/png').split(',')[1];
                    addLog(`截图Base64长度: ${base64.length}`, 'info');
                    resolve(base64);
                }).catch(error => {
                    addLog(`html2canvas截图失败: ${error.message}`, 'error');
                    // 降级到手动截取
                    captureElementManually(element, resolve, reject);
                });
                
            } catch (error) {
                addLog(`截图失败: ${error.message}`, 'error');
                reject(error);
            }
        });
    }
    
    // 手动截取元素（降级方案）
    function captureElementManually(element, resolve, reject) {
        try {
            const rect = element.getBoundingClientRect();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = rect.width;
            canvas.height = rect.height;
            
            // 创建一个临时的canvas来绘制整个页面
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = window.innerWidth;
            tempCanvas.height = window.innerHeight;
            
            // 绘制页面背景色
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // 查找元素内的所有图片并绘制
            const images = element.querySelectorAll('img');
            let loadedImages = 0;
            const totalImages = images.length;
            
            if (totalImages === 0) {
                // 没有图片，直接返回空白截图
                const base64 = canvas.toDataURL('image/png').split(',')[1];
                addLog(`手动截图完成，Base64长度: ${base64.length}`, 'info');
                resolve(base64);
                return;
            }
            
            images.forEach(img => {
                if (img.complete && img.naturalWidth > 0) {
                    const imgRect = img.getBoundingClientRect();
                    const relativeX = imgRect.left - rect.left;
                    const relativeY = imgRect.top - rect.top;
                    
                    ctx.drawImage(img, relativeX, relativeY, imgRect.width, imgRect.height);
                    loadedImages++;
                    
                    if (loadedImages === totalImages) {
                        const base64 = canvas.toDataURL('image/png').split(',')[1];
                        addLog(`手动截图完成，Base64长度: ${base64.length}`, 'info');
                        resolve(base64);
                    }
                } else {
                    loadedImages++;
                    if (loadedImages === totalImages) {
                        const base64 = canvas.toDataURL('image/png').split(',')[1];
                        addLog(`手动截图完成，Base64长度: ${base64.length}`, 'info');
                        resolve(base64);
                    }
                }
            });
            
        } catch (error) {
            addLog(`手动截图失败: ${error.message}`, 'error');
            reject(error);
        }
    }

    // 发送识别请求
    function recognizeCaptcha(base64Image) {
        return new Promise((resolve, reject) => {
            const data = {
                image: base64Image,
                token: CONFIG.token,
                type: CONFIG.type
            };

            GM_xmlhttpRequest({
                method: 'POST',
                url: CONFIG.apiUrl,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(data),
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.code === 10000) {
                            resolve(result.data.data);
                        } else {
                            reject(new Error(`识别失败: ${result.msg}`));
                        }
                    } catch (error) {
                        reject(new Error('解析响应失败'));
                    }
                },
                onerror: function(error) {
                    reject(new Error('网络请求失败'));
                }
            });
        });
    }

    // 解析坐标字符串
    function parseCoordinates(coordString) {
        const coordinates = [];
        const pairs = coordString.split('|');  // 按|分割坐标对
        
        for (const pair of pairs) {
            const [x, y] = pair.split(',').map(coord => parseInt(coord.trim()));
            if (!isNaN(x) && !isNaN(y)) {
                coordinates.push({ x, y });
            }
        }
        return coordinates;
    }

    // 显示点击反馈效果
    function showClickFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            left: ${x - 15}px;
            top: ${y - 15}px;
            width: 30px;
            height: 30px;
            border: 3px solid red;
            border-radius: 50%;
            background: rgba(255, 0, 0, 0.3);
            z-index: 99999;
            pointer-events: none;
            animation: clickFeedback 0.6s ease-out forwards;
        `;
        
        // 添加CSS动画
        if (!document.getElementById('click-feedback-style')) {
            const style = document.createElement('style');
            style.id = 'click-feedback-style';
            style.textContent = `
                @keyframes clickFeedback {
                    0% { transform: scale(0.5); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 600);
    }

    // 点击单个坐标
    function clickCoordinate(element, x, y) {
        const rect = element.getBoundingClientRect();
        const clickX = rect.left + x;
        const clickY = rect.top + y;
        
        // 创建点击事件
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: clickX,
            clientY: clickY
        });
        
        // 在指定坐标处触发点击
        const targetElement = document.elementFromPoint(clickX, clickY);
        if (targetElement) {
            targetElement.dispatchEvent(clickEvent);
            addLog(`点击坐标: (${x}, ${y}) -> 屏幕坐标: (${clickX}, ${clickY})`, 'info');
        } else {
            addLog(`无法找到点击目标: (${clickX}, ${clickY})`, 'warning');
        }
    }
    
    // 点击多个坐标
    function clickCoordinates(element, coordinates) {
        coordinates.forEach((coord, index) => {
            setTimeout(() => {
                clickCoordinate(element, coord.x, coord.y);
            }, index * 200); // 每个点击间隔200ms
        });
    }

    // 主要处理函数 - 使用截屏方式
    async function processCaptcha() {
        try {
            updateStatus('正在处理验证码...', 'processing');
            addLog('开始处理验证码（截屏模式）', 'processing');
            
            // 防止重复处理
            if (window.captchaProcessing) {
                addLog('验证码正在处理中，跳过重复请求', 'warning');
                return;
            }
            window.captchaProcessing = true;
            
            // 查找验证码容器元素 - 优先使用更大的容器
            const selectors = [
                '#tianai-captcha',           // 优先使用更大的验证码容器
                '#tianai-captcha-bg-img',    // 备选
                '#tianai-captcha-box',
                '.tianai-captcha',
                '.captcha-container',
                '[id*="captcha"]'
            ];
            
            let captchaElement = null;
            for (const selector of selectors) {
                captchaElement = document.querySelector(selector);
                if (captchaElement) {
                    addLog(`找到验证码容器: ${selector}`, 'info');
                    break;
                }
            }
            
            if (!captchaElement) {
                const errorMsg = '未找到验证码容器元素';
                console.log(errorMsg);
                addLog(errorMsg, 'error');
                updateStatus('未找到验证码容器', 'error');
                return;
            }

            addLog('✓ 找到验证码容器元素', 'success');
            addLog(`容器类型: ${captchaElement.tagName}, id: ${captchaElement.id}`, 'info');
            
            // 等待一下确保验证码完全加载
            addLog('等待验证码完全加载...', 'processing');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 截取验证码区域
            addLog('正在截取验证码区域...', 'processing');
            const base64Image = await captureElementToBase64(captchaElement);
            addLog('✓ 验证码区域截取完成', 'success');
            console.log('验证码截图完成');

            // 发送识别请求
            addLog('正在发送识别请求到API...', 'processing');
            updateStatus('正在识别验证码...', 'processing');
            const coordinatesString = await recognizeCaptcha(base64Image);
            addLog(`✓ 识别成功: ${coordinatesString}`, 'success');
            console.log('识别结果:', coordinatesString);

            // 解析坐标
            const coordinates = parseCoordinates(coordinatesString);
            addLog(`✓ 解析坐标: ${coordinates.length}个点`, 'success');
            console.log('解析的坐标:', coordinates);

            // 按顺序点击坐标
            addLog('开始按顺序点击坐标...', 'processing');
            updateStatus('正在点击坐标...', 'processing');
            addLog(`将在验证码区域内点击 ${coordinates.length} 个坐标`, 'info');
            clickCoordinates(captchaElement, coordinates);
            
            // 等待一下再提交验证
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 查找并点击验证按钮
            const submitButton = document.querySelector('[type="submit"], .submit-btn, #submit, .verify-btn');
            if (submitButton) {
                submitButton.click();
                addLog('✅ 已点击验证按钮', 'success');
            }
            
            updateStatus('验证码处理完成', 'success');
            console.log('验证码处理流程完成');
            
            // 延迟重置处理标志，避免立即重复处理
            setTimeout(() => {
                window.captchaProcessing = false;
            }, 2000);

        } catch (error) {
            const errorMsg = `处理验证码时出错: ${error.message}`;
            console.error(errorMsg);
            addLog(errorMsg, 'error');
            updateStatus('处理失败', 'error');
            
            // 出错时也要重置处理标志
            window.captchaProcessing = false;
        }
    }

    // 监听页面变化，自动处理验证码
    function observePageChanges() {
        addLog('开始监听页面变化...', 'info');
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 检查多个可能的验证码容器 - 优先使用更大的容器
                    const selectors = [
                        '#tianai-captcha',           // 优先使用更大的验证码容器
                        '#tianai-captcha-bg-img',    // 备选
                        '#tianai-captcha-box',
                        '.tianai-captcha'
                    ];
                    
                    for (const selector of selectors) {
                        const captchaElement = document.querySelector(selector);
                        if (captchaElement && !captchaElement.dataset.processed) {
                            addLog(`🎯 检测到新的验证码容器: ${selector}`, 'success');
                            updateStatus('检测到验证码', 'processing');
                            captchaElement.dataset.processed = 'true';
                            setTimeout(() => {
                                addLog('延迟3秒后开始处理验证码...', 'processing');
                                processCaptcha();
                            }, 3000); // 延迟3秒处理，确保验证码完全加载
                            break;
                        }
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        addLog('✓ 页面监听器已启动', 'success');
    }

    // 创建状态显示面板
    function createStatusPanel() {
        const panel = document.createElement('div');
        panel.id = 'captcha-status-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 10000;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            min-width: 250px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">🤖 验证码识别状态</div>
            <div id="status-text">等待页面加载...</div>
            <div style="margin-top: 10px;">
                <button id="manual-start">手动开始</button>
                <button id="close-panel">关闭</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 绑定按钮事件
        document.getElementById('manual-start').onclick = processCaptcha;
        document.getElementById('close-panel').onclick = () => {
            panel.style.display = 'none';
        };
        
        return panel;
    }
    
    // 简化的日志函数
    function log(message) {
        console.log('[验证码识别] ' + message);
    }
    
    // 兼容旧的addLog函数
    function addLog(message, type = 'info') {
        log(message);
    }
    
    // 更新状态
    function updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-text');
        if (!statusElement) return;
        
        let icon = '✅';
        let color = '#00ff00';
        
        switch(type) {
            case 'processing':
                icon = '🔄';
                color = '#00aaff';
                break;
            case 'error':
                icon = '❌';
                color = '#ff4444';
                break;
            case 'waiting':
                icon = '⏳';
                color = '#ffaa00';
                break;
        }
        
        statusElement.innerHTML = `<span style="color: ${color}">${icon} ${message}</span>`;
    }

    // 初始化脚本
    function init() {
        if (!isTargetPage()) {
            console.log('不在目标页面，脚本不运行');
            return;
        }

        console.log('验证码自动识别脚本已启动');
        
        // 创建状态面板
        createStatusPanel();
        addLog('脚本初始化完成', 'success');
        addLog(`当前页面: ${window.location.href}`, 'info');
        
        // 检查页面是否已经有验证码容器 - 优先使用更大的容器
        const selectors = [
            '#tianai-captcha',           // 优先使用更大的验证码容器
            '#tianai-captcha-bg-img',    // 备选
            '#tianai-captcha-box',
            '.tianai-captcha'
        ];
        
        let existingCaptcha = null;
        for (const selector of selectors) {
            existingCaptcha = document.querySelector(selector);
            if (existingCaptcha) {
                addLog(`发现验证码容器: ${selector}`, 'info');
                break;
            }
        }
        
        if (existingCaptcha) {
            addLog('发现验证码容器，准备处理...', 'processing');
            updateStatus('发现验证码，准备处理', 'processing');
            setTimeout(processCaptcha, 3000); // 延迟3秒确保完全加载
        } else {
            addLog('未发现验证码容器，等待页面变化...', 'warning');
            updateStatus('等待验证码出现', 'waiting');
        }

        // 监听页面变化
        observePageChanges();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();