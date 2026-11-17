(() => {
  if (window.__oddzBeforeUnloadHookInstalled) return;
  window.__oddzBeforeUnloadHookInstalled = true;

  const SIGNAL = "ODDZ_SUPPRESS_BEFOREUNLOAD";
  const tracked = [];

  // EventTarget.prototype 전체를 건드리지 않는다.
  // LMS/UniPlayer가 등록하는 unload 등 모든 이벤트가 우리 래퍼를 통과하면
  // 브라우저 경고가 beforeunload-hook.js 위치로 잘못 표시될 수 있기 때문이다.
  const originalWindowAdd = window.addEventListener.bind(window);
  const originalWindowRemove = window.removeEventListener.bind(window);

  window.addEventListener = function(type, listener, options) {
    if (type === "beforeunload" && listener) {
      tracked.push({ listener, options });
    }

    return originalWindowAdd(type, listener, options);
  };

  window.removeEventListener = function(type, listener, options) {
    if (type === "beforeunload" && listener) {
      for (let i = tracked.length - 1; i >= 0; i--) {
        if (tracked[i].listener === listener) {
          tracked.splice(i, 1);
        }
      }
    }

    return originalWindowRemove(type, listener, options);
  };

  document.addEventListener(SIGNAL, () => {
    console.log("[오늘의 강의] 자동 이동 직전 beforeunload 경고 해제", {
      tracked: tracked.length,
      href: location.href
    });

    for (const item of tracked.splice(0)) {
      try {
        originalWindowRemove(
          "beforeunload",
          item.listener,
          item.options
        );
      } catch {}
    }

    try {
      window.onbeforeunload = null;
    } catch {}
  });
})();
