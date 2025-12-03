// ==UserScript==
// @name         爱赌系列-自动识别点选验证码
// @namespace    verifybot11.top-helper
// @version      1.0.0
// @description  自动截图验证码并调用云码识别，按返回坐标点击
// @author       PG
// @match        https://verifybot11.top/*
// @match        https://hbyz.chigua6.it.com/*
// @require      https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @connect      api.jfbym.com
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // 云码接口配置（点选类）
  const API_URL = 'http://api.jfbym.com/api/YmServer/customApi';
  const JFBYM_TOKEN = 'gP6Ft0Sk6YlgOed4xCOhh56I35IbRkj0KswXlcOwcHQ';
  const JFBYM_TYPE = '88888'; // 用户指定类型
  const JFBYM_EXTRA = ''; // 如无法自动获取指令文本，可在此手动填写（例如："我爱中国"）

  // 工具函数：提示通知
  function notify(title, text) {
    try {
      GM_notification({ title, text, timeout: 3000 });
    } catch (_) {
      console.log(title + ': ' + text);
    }
  }

  function hasChinese(str) {
    return /[\u4e00-\u9fa5]/.test(str || '');
  }

  function extractChineseTargets(text) {
    if (!text) return '';
    const m1 = text.match(/[：:]\s*([\u4e00-\u9fa5\s]+)/);
    if (m1 && m1[1]) return m1[1].replace(/\s+/g, '');
    const m2 = text.match(/“([\u4e00-\u9fa5\s]+)”/);
    if (m2 && m2[1]) return m2[1].replace(/\s+/g, '');
    const m3 = text.match(/点击[\u4e00-\u9fa5\s]+/);
    if (m3) return (m3[0].replace(/^点击/, '')).replace(/\s+/g, '');
    return '';
  }

  function findCaptchaElement() {
    const selectors = [
      'img[src*="captcha"]',
      'img[alt*="验证码"]',
      '.captcha img',
      '.captcha canvas',
      'canvas[class*="captcha"]',
      'canvas',
      '.geetest_item_img',
      '.geetest_wrap img',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // 兜底：找包含“验证码”的容器里的图片或画布
    const all = Array.from(document.querySelectorAll('*'));
    const cand = all.filter(n => {
      const t = (n.innerText || '').trim();
      return t.includes('验证码') || t.includes('点选') || t.includes('点击');
    });
    for (const c of cand) {
      const img = c.querySelector('img');
      if (img) return img;
      const canvas = c.querySelector('canvas');
      if (canvas) return canvas;
    }
    return null;
  }

  function extractExtraText() {
    if (JFBYM_EXTRA && JFBYM_EXTRA.trim()) return JFBYM_EXTRA.trim();
    const hints = [
      '.tips', '.tip', '.captcha-tips', '.captcha-tip', '.geetest_tip', '.geetest_desc',
      '.instruction', '.desc', '.notice', '.verify-desc', '.verify-tip'
    ];
    for (const sel of hints) {
      const el = document.querySelector(sel);
      const text = (el && (el.innerText || '').trim()) || '';
      if (text && hasChinese(text)) {
        const extracted = extractChineseTargets(text);
        return extracted || text;
      }
    }
    const pageText = document.body.innerText || '';
    if (pageText && hasChinese(pageText)) {
      const extracted = extractChineseTargets(pageText);
      return extracted || pageText.trim();
    }
    return '';
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function imageElementToBase64(el) {
    return new Promise((resolve, reject) => {
      if (!el) return reject(new Error('未找到元素'));
      const tag = el.tagName.toLowerCase();
      if (tag === 'canvas') {
        try {
          const b64 = el.toDataURL('image/png').split(',')[1];
          return resolve(b64);
        } catch (e) {
          return reject(e);
        }
      }
      if (tag === 'img') {
        const src = el.src || '';
        if (!src) return reject(new Error('IMG 无 src'));
        if (src.startsWith('data:')) {
          const idx = src.indexOf('base64,');
          const b64 = idx >= 0 ? src.slice(idx + 7) : src;
          return resolve(b64);
        }
        // 跨域图片用 GM_xmlhttpRequest 获取为 base64
        GM_xmlhttpRequest({
          method: 'GET',
          url: src,
          responseType: 'arraybuffer',
          onload: function(r) {
            try {
              const b64 = arrayBufferToBase64(r.response);
              resolve(b64);
            } catch (e) { reject(e); }
          },
          onerror: function(e) { reject(new Error('图片获取失败')); }
        });
        return;
      }
      reject(new Error('不支持的元素类型'));
    });
  }

  // 整页截图（使用 html2canvas），返回 base64
  async function screenshotFullPageToBase64() {
    const docEl = document.documentElement;
    const width = Math.max(docEl.scrollWidth, docEl.clientWidth);
    const height = Math.max(docEl.scrollHeight, docEl.clientHeight);
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 1,
        windowWidth: width,
        windowHeight: height,
        scrollX: 0,
        scrollY: 0,
      });
      const dataURL = canvas.toDataURL('image/png');
      return dataURL.split(',')[1];
    } catch (e) {
      throw new Error('整页截图失败：' + (e.message || e));
    }
  }

  function askJfbymClick({ base64, extra }) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ token: JFBYM_TOKEN, type: JFBYM_TYPE, image: base64, extra: extra || '' });
      GM_xmlhttpRequest({
        method: 'POST',
        url: API_URL,
        headers: { 'Content-Type': 'application/json' },
        data: body,
        onload: function(r) {
          try {
            const json = JSON.parse(r.responseText || '{}');
            // 兼容不同的成功返回码：部分类型返回 10000 表示识别成功
            const success = json && (json.code === 0 || json.code === 10001 || json.code === 10000 || /成功/.test(String(json.msg || '')));
            console.log('云码返回原始数据：', json);
            if (!success) {
              reject(new Error(`云码识别失败：code=${json.code} msg=${json.msg || ''}`));
            } else {
              resolve(json);
            }
          } catch (e) { reject(e); }
        },
        onerror: function(e) { reject(new Error('云码接口请求失败')); }
      });
    });
  }

  function parseClickPoints(resp) {
    const points = [];
    function pushPt(x, y) {
      const xi = Math.round(Number(x));
      const yi = Math.round(Number(y));
      if (Number.isFinite(xi) && Number.isFinite(yi)) points.push({ x: xi, y: yi });
    }
    const d = resp && resp.data;
    const tryString = (s) => {
      if (!s || typeof s !== 'string') return;
      const parts = s.split('|');
      for (const p of parts) {
        const [x, y] = p.split(',');
        if (x !== undefined && y !== undefined) pushPt(x, y);
      }
    };
    const tryArray = (arr) => {
      for (const it of arr) {
        if (typeof it === 'string') tryString(it);
        else if (Array.isArray(it)) tryArray(it);
        else if (it && typeof it === 'object') {
          if ('x' in it && 'y' in it) pushPt(it.x, it.y);
          if ('value' in it) tryString(it.value);
          if ('data' in it && typeof it.data === 'string') tryString(it.data);
          if ('points' in it && Array.isArray(it.points)) tryArray(it.points);
          if ('pointList' in it && Array.isArray(it.pointList)) tryArray(it.pointList);
        }
      }
    };
    if (typeof d === 'string') tryString(d);
    else if (Array.isArray(d)) tryArray(d);
    else if (typeof d === 'object' && d) {
      if ('value' in d) tryString(d.value);
      if ('data' in d && typeof d.data === 'string') tryString(d.data);
      if ('points' in d && Array.isArray(d.points)) tryArray(d.points);
      if ('pointList' in d && Array.isArray(d.pointList)) tryArray(d.pointList);
    }
    return points;
  }

  // 仅保留排序逻辑：按 .sequence-number 的数字进行升序（01→02→03→04）
  function extractNumberFromItem(item) {
    if (!item) return Number.POSITIVE_INFINITY;
    const numEl = item.querySelector('.sequence-number');
    const text = (numEl && numEl.textContent || '').trim();
    const m = text && text.match(/\d+/);
    return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
  }

  function sortSequenceAsc() {
    const container = document.querySelector('.sequence-display');
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.sequence-item'));
    if (!items.length) return;
    const sorted = items.slice().sort((a, b) => extractNumberFromItem(a) - extractNumberFromItem(b));
    sorted.forEach(el => container.appendChild(el));
  }

  async function clickPointsOnPage(element, points) {
    if (!points.length) return;
    const doc = document;
    const win = window;

    // 点击涟漪特效
    function ripple(x, y) {
      const ripple = doc.createElement('div');
      ripple.style.position = 'fixed';
      ripple.style.left = x - 10 + 'px';
      ripple.style.top = y - 10 + 'px';
      ripple.style.width = '20px';
      ripple.style.height = '20px';
      ripple.style.borderRadius = '50%';
      ripple.style.border = '2px solid rgba(0,128,255,0.9)';
      ripple.style.background = 'rgba(0,128,255,0.15)';
      ripple.style.pointerEvents = 'none';
      ripple.style.zIndex = '999999';
      ripple.style.transform = 'scale(0.8)';
      ripple.style.transition = 'transform 300ms ease, opacity 600ms ease';
      doc.body.appendChild(ripple);
      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(2.2)';
        ripple.style.opacity = '0';
      });
      setTimeout(() => ripple.remove(), 700);
    }

    // 序号标记，便于核验点击顺序
    function markIndex(x, y, idx) {
      const tag = doc.createElement('div');
      tag.textContent = String(idx + 1);
      tag.style.position = 'fixed';
      tag.style.left = x + 8 + 'px';
      tag.style.top = y + 8 + 'px';
      tag.style.padding = '2px 4px';
      tag.style.fontSize = '12px';
      tag.style.color = '#fff';
      tag.style.background = 'rgba(255,0,0,0.8)';
      tag.style.borderRadius = '4px';
      tag.style.pointerEvents = 'none';
      tag.style.zIndex = '999999';
      doc.body.appendChild(tag);
      setTimeout(() => tag.remove(), 1500);
    }

    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i];
      // 将页面滚动到目标附近
      const viewportH = win.innerHeight || doc.documentElement.clientHeight;
      const viewportW = win.innerWidth || doc.documentElement.clientWidth;
      const targetScrollY = Math.max(0, y - Math.floor(viewportH / 2));
      const targetScrollX = Math.max(0, x - Math.floor(viewportW / 2));
      win.scrollTo({ left: targetScrollX, top: targetScrollY, behavior: 'smooth' });

      // 等待滚动完成一小段时间
      await new Promise(r => setTimeout(r, 200));
      // 注：坐标是基于整页截图的绝对坐标，因此需要减去当前滚动偏移得到客户端坐标
      let clientX = Math.round(x - win.scrollX);
      let clientY = Math.round(y - win.scrollY);
      // 边界裁剪，避免越界导致 elementFromPoint 异常
      clientX = Math.max(0, Math.min(clientX, (win.innerWidth || doc.documentElement.clientWidth) - 1));
      clientY = Math.max(0, Math.min(clientY, (win.innerHeight || doc.documentElement.clientHeight) - 1));

      // 触发真实点击事件序列
      ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(type => {
        const target = doc.elementFromPoint(clientX, clientY) || doc.body;
        let evt;
        if (type.startsWith('pointer')) {
          evt = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            pointerId: 1,
            pointerType: 'mouse',
          });
        } else {
          evt = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
          });
        }
        target.dispatchEvent(evt);
      });

      ripple(clientX, clientY);
      markIndex(clientX, clientY, i);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  async function run() {
    try {
      const extra = extractExtraText();
      // 改为整页截图并识别
      const base64 = await screenshotFullPageToBase64();
      const resp = await askJfbymClick({ base64, extra });
      const points = parseClickPoints(resp);
      if (!points.length) {
        notify('识别提示', '云码返回无坐标');
        return;
      }
      await clickPointsOnPage(null, points);
      notify('识别完成', '已按整页坐标点击并显示特效');
    } catch (e) {
      console.error(e);
      notify('识别异常', e.message || String(e));
    }
  }

  // 页面就绪后自动执行（也可改为按钮触发）
  const start = () => { sortSequenceAsc(); setTimeout(run, 1000); };
  if (document.readyState === 'complete' || document.readyState === 'interactive') start();
  else window.addEventListener('DOMContentLoaded', start);
})();
