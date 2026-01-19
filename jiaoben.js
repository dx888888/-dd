// ==TeleModScript==
// @name        NewDevice_AntiFingerprint
// @version     1.0.0
// @description New device style anti-fingerprint for TeleMod
// @icon        https://telegram.org/img/t_logo.png
// @author      custom
// @run-at      document-start
// ==/TeleModScript==

(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  var androidDevices = [
    "Pixel 9 Pro Build/AD1A.240418.003",
    "Pixel 9 Build/AD1A.240411.003.A5",
    "Pixel 8 Pro Build/AP4A.250105.002",
    "Pixel 8 Build/AP4A.250105.002",
    "Pixel 7 Pro",
    "Pixel 6 Pro",
    "SM-G9750 Build/QP1A.190711.020",
    "SM-S931B Build/AP3A.240905.015.A2",
    "SM-S931U Build/AP3A.240905.015.A2",
    "Redmi Note 9 Pro",
    "Redmi Note 8 Pro Build/QP1A.190711.020",
    "M2102J20SG",
    "moto g power 5G - 2024 Build/U1UD34.16-62"
  ];

  function generateProfile() {
    var device = pick(androidDevices);
    var androidMajor = pick([10, 11, 12, 13, 14]);
    var chromeMajor = pick([120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130]);
    var webkitBuild = randInt(537, 539) + "." + randInt(0, 36);
    var chromeVer = chromeMajor + ".0." + randInt(1000, 5999) + "." + randInt(50, 150);

    var ua =
      "Mozilla/5.0 (Linux; Android " + androidMajor +
      "; " + device + ")" +
      " AppleWebKit/" + webkitBuild +
      " (KHTML, like Gecko) Chrome/" + chromeVer +
      " Mobile Safari/" + webkitBuild;

    var width = pick([360, 384, 390, 412]);
    var height = pick([780, 800, 844, 915, 932]);
    var dpr = pick([2, 2.5, 3]);

    return {
      userAgent: ua,
      appVersion: ua.replace(/^Mozilla\/5\.0 /, ""),
      platform: "Linux armv8l",
      language: "zh-CN",
      languages: ["zh-CN", "zh"],
      hardwareConcurrency: pick([4, 6, 8]),
      maxTouchPoints: pick([5, 10]),
      deviceMemory: pick([4, 6, 8]),
      vendor: "Google Inc.",
      appName: "Netscape",
      timezoneOffset: -8 * 60,
      timezone: "Asia/Shanghai",
      dpr: dpr,
      screen: {
        width: width,
        height: height,
        availWidth: width,
        availHeight: height,
        colorDepth: 24,
        pixelDepth: 24
      },
      webglVendor: pick([
        "Qualcomm",
        "ARM",
        "Imagination Technologies",
        "Samsung"
      ]),
      webglRenderer: pick([
        "Adreno (TM) 740",
        "Adreno (TM) 730",
        "Mali-G78",
        "Mali-G615"
      ])
    };
  }

  function defineGetter(obj, prop, value) {
    try {
      Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: false,
        get: function () { return value; }
      });
    } catch (e) {}
  }

  function applyProfile(profile) {
    try {
      if (typeof navigator !== "undefined") {
        defineGetter(navigator, "userAgent", profile.userAgent);
        defineGetter(navigator, "appVersion", profile.appVersion);
        defineGetter(navigator, "platform", profile.platform);
        defineGetter(navigator, "language", profile.language);
        defineGetter(navigator, "languages", profile.languages);
        defineGetter(navigator, "hardwareConcurrency", profile.hardwareConcurrency);
        defineGetter(navigator, "maxTouchPoints", profile.maxTouchPoints);
        if ("deviceMemory" in navigator) {
          defineGetter(navigator, "deviceMemory", profile.deviceMemory);
        }
        if ("vendor" in navigator) {
          defineGetter(navigator, "vendor", profile.vendor);
        }
        if ("appName" in navigator) {
          defineGetter(navigator, "appName", profile.appName);
        }
      }
    } catch (e) {}

    try {
      if (typeof screen !== "undefined" && profile.screen) {
        defineGetter(screen, "width", profile.screen.width);
        defineGetter(screen, "height", profile.screen.height);
        defineGetter(screen, "availWidth", profile.screen.availWidth);
        defineGetter(screen, "availHeight", profile.screen.availHeight);
        defineGetter(screen, "colorDepth", profile.screen.colorDepth);
        defineGetter(screen, "pixelDepth", profile.screen.pixelDepth);
      }
    } catch (e) {}

    try {
      var origOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function () {
        return profile.timezoneOffset;
      };
      if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
        var OrigDTF = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function () {
          var dtf = new OrigDTF(arguments[0], arguments[1]);
          var orig = dtf.resolvedOptions;
          dtf.resolvedOptions = function () {
            var o = orig.call(this);
            o.timeZone = profile.timezone;
            return o;
          };
          return dtf;
        };
        Intl.DateTimeFormat.prototype = OrigDTF.prototype;
      }
    } catch (e) {}

    try {
      var dprDesc = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
      if (!dprDesc || !dprDesc.get) {
        defineGetter(window, "devicePixelRatio", profile.dpr);
      }
    } catch (e) {}
  }

  function seedRandom(seed) {
    var x = seed >>> 0;
    return function () {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function getTabSeed() {
    var nav = typeof navigator !== "undefined" ? navigator : {};
    var ua = nav.userAgent || "";
    var platform = nav.platform || "";
    var lang = nav.language || "";
    var t = Date.now();
    var rnd;
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        var arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        rnd = arr[0];
      } else {
        rnd = Math.floor(Math.random() * 0xffffffff);
      }
    } catch (e) {
      rnd = Math.floor(Math.random() * 0xffffffff);
    }
    return hashString([ua, platform, lang, String(t), String(rnd)].join("::"));
  }

  var TAB_SEED = getTabSeed();
  var randSeeded = seedRandom(TAB_SEED);

  function smallNoise(scale) {
    var v = randSeeded() - 0.5;
    return v * 2 * scale;
  }

  function stableNoiseForKey(key, scale) {
    var localRand = seedRandom(hashString(key + "::" + String(TAB_SEED)));
    var v = localRand() - 0.5;
    return v * 2 * scale;
  }

  function defineSafe(obj, prop, value) {
    try {
      Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: value
      });
    } catch (e) {
      try {
        obj[prop] = value;
      } catch (e2) {}
    }
  }

  function patchCanvas() {
    var HTMLCanvasElementRef = window.HTMLCanvasElement;
    var OffscreenCanvasRef = window.OffscreenCanvas;
    var CanvasRenderingContext2DRef = window.CanvasRenderingContext2D;

    function addNoiseToImageData(imgData, keyPrefix, scale) {
      try {
        var data = imgData.data;
        for (var i = 0; i < data.length; i += 4) {
          var n = stableNoiseForKey(keyPrefix + ":" + i, scale);
          data[i] = Math.max(0, Math.min(255, data[i] + n));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        }
      } catch (e) {}
    }

    function wrapToDataURL(proto) {
      if (!proto || !proto.toDataURL) return;
      var orig = proto.toDataURL;
      defineSafe(proto, "toDataURL", function () {
        var ctx2d = this.getContext && this.getContext("2d");
        if (ctx2d && ctx2d.getImageData) {
          try {
            var w = Math.min(this.width, 32);
            var h = Math.min(this.height, 32);
            var imgData = ctx2d.getImageData(0, 0, w, h);
            addNoiseToImageData(imgData, "canvas2d", 1.1);
            ctx2d.putImageData(imgData, 0, 0);
          } catch (e) {}
          return orig.apply(this, arguments);
        }

        var gl = this.getContext &&
          (this.getContext("webgl") ||
           this.getContext("experimental-webgl") ||
           this.getContext("webgl2"));

        if (gl && typeof document !== "undefined" && document.createElement) {
          try {
            var w2 = this.width;
            var h2 = this.height;
            var tmp = document.createElement("canvas");
            tmp.width = w2;
            tmp.height = h2;
            var tctx = tmp.getContext("2d");
            if (tctx) {
              tctx.drawImage(this, 0, 0);
              var imgData2 = tctx.getImageData(0, 0, Math.min(w2, 32), Math.min(h2, 32));
              addNoiseToImageData(imgData2, "canvas-webgl", 1.3);
              tctx.putImageData(imgData2, 0, 0);
              return orig.apply(tmp, arguments);
            }
          } catch (e) {}
        }

        return orig.apply(this, arguments);
      });
    }

    function wrapGetImageData(proto) {
      if (!proto || !proto.getImageData) return;
      var orig = proto.getImageData;
      defineSafe(proto, "getImageData", function () {
        var res = orig.apply(this, arguments);
        addNoiseToImageData(res, "getImageData", 0.5);
        return res;
      });
    }

    function wrapMeasureText() {
      if (!CanvasRenderingContext2DRef || !CanvasRenderingContext2DRef.prototype || !CanvasRenderingContext2DRef.prototype.measureText) return;
      var proto = CanvasRenderingContext2DRef.prototype;
      var orig = proto.measureText;
      defineSafe(proto, "measureText", function (text) {
        var res = orig.apply(this, arguments);
        try {
          var key = "font-" + String(text) + "|" + String(this.font || "");
          var dx = stableNoiseForKey(key + ":w", 0.3);
          var adv = res.width || 0;
          defineSafe(res, "width", adv + dx);
        } catch (e) {}
        return res;
      });
    }

    if (HTMLCanvasElementRef && HTMLCanvasElementRef.prototype) {
      wrapToDataURL(HTMLCanvasElementRef.prototype);
      if (CanvasRenderingContext2DRef && CanvasRenderingContext2DRef.prototype) {
        wrapGetImageData(CanvasRenderingContext2DRef.prototype);
      }
    }
    if (OffscreenCanvasRef && OffscreenCanvasRef.prototype) {
      wrapToDataURL(OffscreenCanvasRef.prototype);
    }
    wrapMeasureText();
  }

  function patchWebGL() {
    var glClasses = [];
    if (window.WebGLRenderingContext) {
      glClasses.push(window.WebGLRenderingContext);
    }
    if (window.WebGL2RenderingContext) {
      glClasses.push(window.WebGL2RenderingContext);
    }

    function clamp255(v) {
      return Math.max(0, Math.min(255, v));
    }

    glClasses.forEach(function (Ctor) {
      if (!Ctor || !Ctor.prototype) return;
      var proto = Ctor.prototype;

      if (proto.getParameter) {
        var origGetParameter = proto.getParameter;
        defineSafe(proto, "getParameter", function (pname) {
          try {
            if (typeof window.WebGLRenderingContext !== "undefined") {
              var glEnum = window.WebGLRenderingContext;
              if (pname === glEnum.UNMASKED_VENDOR_WEBGL || pname === glEnum.UNMASKED_RENDERER_WEBGL) {
                return origGetParameter.call(this, pname);
              }
            }
          } catch (e) {}
          var res = origGetParameter.call(this, pname);
          if (typeof res === "number") {
            var noise = smallNoise(1.5);
            return res + noise;
          }
          return res;
        });
      }

      if (proto.getSupportedExtensions) {
        var origExt = proto.getSupportedExtensions;
        defineSafe(proto, "getSupportedExtensions", function () {
          var res = origExt.call(this);
          if (!Array.isArray(res)) return res;
          var copy = res.slice();
          if (copy.length > 0) {
            var idx = Math.floor(randSeeded() * copy.length);
            var key = "webgl-ext-" + idx;
            var inject = stableNoiseForKey(key, 1) > 0
              ? "EXT_" + Math.abs(stableNoiseForKey(key + ":n", 1e4)).toFixed(0)
              : null;
            if (inject && copy.indexOf(inject) === -1) copy.push(inject);
          }
          return copy;
        });
      }

      if (proto.readPixels) {
        var origReadPixels = proto.readPixels;
        defineSafe(proto, "readPixels", function (x, y, width, height, format, type, pixels) {
          var res = origReadPixels.apply(this, arguments);
          try {
            if (pixels && pixels.length && typeof pixels[0] === "number") {
              var len = pixels.length;
              for (var i = 0; i < len; i += 4) {
                var n = smallNoise(3);
                pixels[i] = clamp255(pixels[i] + n);
                if (i + 1 < len) pixels[i + 1] = clamp255(pixels[i + 1] + n);
                if (i + 2 < len) pixels[i + 2] = clamp255(pixels[i + 2] + n);
              }
            }
          } catch (e) {}
          return res;
        });
      }
    });
  }

  function patchAudio() {
    var AudioBufferRef = window.AudioBuffer;
    if (AudioBufferRef && AudioBufferRef.prototype && AudioBufferRef.prototype.getChannelData) {
      var proto = AudioBufferRef.prototype;
      var orig = proto.getChannelData;
      defineSafe(proto, "getChannelData", function () {
        var data = orig.apply(this, arguments);
        try {
          var len = data.length;
          var step = Math.max(1, Math.floor(len / 128));
          for (var i = 0; i < len; i += step) {
            var n = smallNoise(0.0005);
            data[i] = data[i] + n;
          }
        } catch (e) {}
        return data;
      });
    }
  }

  function patchDOMRect() {
    var ElementProto = window.Element && window.Element.prototype;
    var RangeProto = window.Range && window.Range.prototype;

    function wrapRectObj(rect, keyPrefix) {
      if (!rect) return rect;
      try {
        var keys = ["x", "y", "width", "height", "top", "left", "right", "bottom"];
        keys.forEach(function (k) {
          if (!(k in rect)) return;
          var origVal = rect[k];
          if (typeof origVal !== "number") return;
          var noiseKey = keyPrefix + ":" + k;
          var n = stableNoiseForKey(noiseKey, 0.7);
          var v = origVal + n;
          try {
            Object.defineProperty(rect, k, {
              configurable: false,
              enumerable: true,
              get: function () {
                return v;
              }
            });
          } catch (e) {}
        });
      } catch (e) {}
      return rect;
    }

    if (ElementProto && ElementProto.getBoundingClientRect) {
      var orig = ElementProto.getBoundingClientRect;
      defineSafe(ElementProto, "getBoundingClientRect", function () {
        var rect = orig.apply(this, arguments);
        var tag = this.tagName || "";
        var id = this.id || "";
        var cls = this.className || "";
        var key = "el:" + tag + "#" + id + "." + cls;
        return wrapRectObj(rect, key);
      });
    }

    if (ElementProto && ElementProto.getClientRects) {
      var origRects = ElementProto.getClientRects;
      defineSafe(ElementProto, "getClientRects", function () {
        var list = origRects.apply(this, arguments);
        try {
          for (var i = 0; i < list.length; i++) {
            var rect = list[i];
            var tag = this.tagName || "";
            var id = this.id || "";
            var cls = this.className || "";
            var key = "elrect:" + tag + "#" + id + "." + cls + ":" + i;
            wrapRectObj(rect, key);
          }
        } catch (e) {}
        return list;
      });
    }

    if (RangeProto && RangeProto.getBoundingClientRect) {
      var origR = RangeProto.getBoundingClientRect;
      defineSafe(RangeProto, "getBoundingClientRect", function () {
        var rect = origR.apply(this, arguments);
        var key = "range:" + String(this.startOffset) + "-" + String(this.endOffset);
        return wrapRectObj(rect, key);
      });
    }
  }

  function patchScreen() {
    var screenRef = window.screen;
    if (!screenRef) return;

    function wrapNumber(obj, prop, scale) {
      if (!obj || !(prop in obj)) return;
      var val = obj[prop];
      if (typeof val !== "number") return;
      var noise = stableNoiseForKey("screen:" + prop, scale);
      var v = val + noise;
      try {
        Object.defineProperty(obj, prop, {
          configurable: false,
          enumerable: true,
          get: function () {
            return v;
          }
        });
      } catch (e) {}
    }

    wrapNumber(screenRef, "width", 3);
    wrapNumber(screenRef, "height", 3);
    wrapNumber(screenRef, "availWidth", 3);
    wrapNumber(screenRef, "availHeight", 3);

    function wrapWindowSize(prop) {
      try {
        var desc = Object.getOwnPropertyDescriptor(window, prop);
        var base = desc && desc.get && desc.get.call ? desc.get.call(window) : window[prop];
        if (typeof base !== "number") return;
        var noise = stableNoiseForKey("win:" + prop, 3);
        var v = base + noise;
        Object.defineProperty(window, prop, {
          configurable: false,
          enumerable: true,
          get: function () {
            return v;
          }
        });
      } catch (e) {}
    }

    wrapWindowSize("innerWidth");
    wrapWindowSize("innerHeight");
    wrapWindowSize("outerWidth");
    wrapWindowSize("outerHeight");
  }

  function patchWebGPU() {
    var nav = typeof navigator !== "undefined" ? navigator : null;
    if (!nav) return;
    var gpu = nav.gpu;
    if (!gpu || !gpu.requestAdapter) return;

    var origRequestAdapter = gpu.requestAdapter.bind(gpu);

    function wrapLimits(limits) {
      if (!limits) return limits;
      var clone = Object.create(Object.getPrototypeOf(limits) || null);
      for (var k in limits) {
        if (!Object.prototype.hasOwnProperty.call(limits, k)) continue;
        var v = limits[k];
        if (typeof v === "number") {
          var n = stableNoiseForKey("webgpu:" + k, 4);
          clone[k] = Math.max(1, v + n);
        } else {
          clone[k] = v;
        }
      }
      return clone;
    }

    function wrapAdapter(adapter) {
      if (!adapter) return adapter;
      if (adapter.__my_fp_wrapped) return adapter;
      var proxy = new Proxy(adapter, {
        get: function (target, prop, receiver) {
          var v = Reflect.get(target, prop, receiver);
          if (prop === "limits") {
            return wrapLimits(v);
          }
          return v;
        }
      });
      Object.defineProperty(proxy, "__my_fp_wrapped", { value: true });
      return proxy;
    }

    Object.defineProperty(nav.gpu, "requestAdapter", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function () {
        var p = origRequestAdapter.apply(this, arguments);
        if (!p || typeof p.then !== "function") return p;
        return p.then(function (adapter) {
          return wrapAdapter(adapter);
        });
      }
    });
  }

  function clearSiteData() {
    try {
      var parts = document.cookie.split(";");
      for (var i = 0; i < parts.length; i++) {
        var raw = parts[i];
        var eqPos = raw.indexOf("=");
        var name = (eqPos > -1 ? raw.substr(0, eqPos) : raw).trim();
        if (!name) continue;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        var firstPath = "/" + (location.pathname.split("/")[1] || "") + "/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + firstPath;
      }
    } catch (e) {}

    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}

    try {
      if (window.indexedDB && indexedDB.databases) {
        indexedDB.databases().then(function (dbs) {
          dbs.forEach(function (db) {
            if (db && db.name) indexedDB.deleteDatabase(db.name);
          });
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function newDevice() {
    clearSiteData();
    var profile = generateProfile();
    applyProfile(profile);
    patchCanvas();
    patchWebGL();
    patchAudio();
    patchDOMRect();
    patchScreen();
    patchWebGPU();
    try {
      window.__telemodNewDeviceProfile = profile;
    } catch (e) {}
  }

  newDevice();
  try {
    window.telemodNewDevice = newDevice;
  } catch (e) {}
})();
