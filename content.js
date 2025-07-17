// ==UserScript==
// @name         自动刷新
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  刷新
// @author       Auto Refresh Bot
// @match        *://*/*
// @grant        none
// @run-at       document-end
// @license      MIT
// ==/UserScript==

// 插件配置信息
const PLUGIN_CONFIG = {
    manifest_version: 3,
    name: "自动刷新验证插件",
    version: "1.0",
    description: "当检测到特定网站有超过3个图片时自动刷新页面",
    permissions: ["activeTab"],
    target_url: "https://roobotcode.zxca.me/",
    max_images: 3,
    max_refresh_count: 50,
    refresh_delay: 300
};

(function() {
    'use strict';

    // 防止无限刷新的标记
    const REFRESH_KEY = 'auto_refresh_count';
    const MAX_REFRESH_COUNT = PLUGIN_CONFIG.max_refresh_count; // 最大刷新次数，防止无限循环

    // 主逻辑
    function main() {
        // 启动监听器
        startObserver();
        // 立即检查一次
        checkAndRefresh();
    }

    function checkAndRefresh() {
        // 只检测验证码容器内的img元素（第80-94行对应的区域）
        const captchaContainer = document.querySelector('.captcha-container');
        if (!captchaContainer) {
            return;
        }
        
        const images = captchaContainer.querySelectorAll('img.char-image');
        const imageCount = images.length;
        
        // 如果图片数量大于配置的最大数量，则刷新页面
        if (imageCount > PLUGIN_CONFIG.max_images) {
            // 检查刷新次数
            let refreshCount = parseInt(sessionStorage.getItem(REFRESH_KEY) || '0');
            
            if (refreshCount >= MAX_REFRESH_COUNT) {
                return;
            }
            
            refreshCount++;
            sessionStorage.setItem(REFRESH_KEY, refreshCount.toString());
            
            // 延迟一下再刷新，避免过于频繁
            setTimeout(() => {
                window.location.reload();
            }, PLUGIN_CONFIG.refresh_delay);
        } else if (imageCount === PLUGIN_CONFIG.max_images) {
            // 清除刷新计数
            sessionStorage.removeItem(REFRESH_KEY);
        }
    }
    
    // 监听验证码容器内的动态内容变化
    const observer = new MutationObserver(function(mutations) {
        let shouldCheck = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                // 检查是否有新增的img元素，且具有char-image类
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if ((node.tagName === 'IMG' && node.classList.contains('char-image')) || 
                            node.querySelector('img.char-image')) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });
        
        if (shouldCheck) {
            setTimeout(checkAndRefresh, 500); // 延迟检查，避免频繁触发
        }
    });
    
    // 开始监听验证码容器的DOM变化
    const startObserver = () => {
        const captchaContainer = document.querySelector('.captcha-container');
        if (captchaContainer) {
            observer.observe(captchaContainer, {
                childList: true,
                subtree: true
            });
        } else {
            // 如果验证码容器还没加载，监听整个body直到找到容器
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    };
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
    
})();