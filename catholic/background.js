const debuggerAttachedTabs = new Set();
const executionContextsByTab = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function setDebug(step, extra = {}) {
  try {
    await chrome.storage.local.set({
      catholicDebugState: {
        step,
        at: Date.now(),
        ...extra
      }
    });
  } catch {}
}

function getContextBucket(tabId) {
  if (!executionContextsByTab.has(tabId)) {
    executionContextsByTab.set(tabId, []);
  }
  return executionContextsByTab.get(tabId);
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source?.tabId;
  if (!tabId) return;

  if (method === "Runtime.executionContextsCleared") {
    executionContextsByTab.set(tabId, []);
    return;
  }

  if (method !== "Runtime.executionContextCreated") return;

  const ctx = params?.context;
  if (!ctx) return;

  const bucket = getContextBucket(tabId);

  const filtered = bucket.filter(item => item.id !== ctx.id);
  filtered.push(ctx);

  executionContextsByTab.set(tabId, filtered);
});

chrome.debugger.onDetach.addListener(source => {
  const tabId = source?.tabId;
  if (!tabId) return;

  debuggerAttachedTabs.delete(tabId);
  executionContextsByTab.delete(tabId);
});

async function ensureDebugger(tabId) {
  if (debuggerAttachedTabs.has(tabId)) return;

  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    debuggerAttachedTabs.add(tabId);
  } catch (error) {
    // 이미 이 확장프로그램이 붙어 있는 경우 등은 계속 진행해 본다.
    const message = String(error?.message || error);
    if (!/already attached|Another debugger/i.test(message)) {
      throw error;
    }
  }

  executionContextsByTab.set(tabId, []);

  await chrome.debugger.sendCommand(
    { tabId },
    "Runtime.enable"
  );
}

async function findCmsMainContext(tabId, timeoutMs = 2500) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const contexts = executionContextsByTab.get(tabId) || [];

    const cms = [...contexts]
      .reverse()
      .find(ctx => {
        const origin = String(ctx.origin || "");
        const aux = ctx.auxData || {};

        return (
          origin === "https://cms.catholic.ac.kr" &&
          aux.isDefault === true
        );
      });

    if (cms) return cms;

    await sleep(100);
  }

  return null;
}

async function playCmsWithUserGesture(tabId) {
  await ensureDebugger(tabId);

  // Runtime.enable 직후 기존 frame의 executionContextCreated 이벤트가
  // 전달될 시간을 조금 준다.
  let context = await findCmsMainContext(tabId);

  if (!context) {
    // context가 아직 안 잡혔으면 Runtime을 한 번 재활성화해서 다시 수집.
    executionContextsByTab.set(tabId, []);
    await chrome.debugger.sendCommand({ tabId }, "Runtime.disable").catch(() => {});
    await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
    context = await findCmsMainContext(tabId);
  }

  if (!context) {
    return {
      ok: false,
      retryable: true,
      error: "CMS 실행 컨텍스트를 아직 찾지 못했습니다."
    };
  }

  const expression = `
    (() => {
      try {
        const target = window.uniPlayer?._uniPlayerEventTarget;

        if (!target || typeof target.fire !== "function") {
          return {
            ok: false,
            retryable: true,
            error: "uniPlayer가 아직 준비되지 않았습니다.",
            href: location.href
          };
        }

        target.fire("vc-front-screen-play-selected");

        return {
          ok: true,
          href: location.href,
          hasBeenActive: navigator.userActivation?.hasBeenActive ?? null,
          isActive: navigator.userActivation?.isActive ?? null
        };
      } catch (error) {
        return {
          ok: false,
          retryable: true,
          error: String(error?.message || error),
          href: location.href
        };
      }
    })()
  `;

  const result = await chrome.debugger.sendCommand(
    { tabId },
    "Runtime.evaluate",
    {
      expression,
      contextId: context.id,
      returnByValue: true,
      awaitPromise: true,

      // 핵심:
      // DevTools Protocol이 이 평가를 사용자 동작에서 실행된 것처럼
      // 처리하도록 요청한다.
      userGesture: true
    }
  );

  const value = result?.result?.value;

  if (result?.exceptionDetails) {
    return {
      ok: false,
      retryable: true,
      error:
        result.exceptionDetails?.exception?.description ||
        result.exceptionDetails?.text ||
        "Runtime.evaluate 오류"
    };
  }

  return value || {
    ok: false,
    retryable: true,
    error: "UniPlayer 실행 결과를 받지 못했습니다."
  };
}

async function detachDebugger(tabId) {
  if (!debuggerAttachedTabs.has(tabId)) return;

  try {
    await chrome.debugger.detach({ tabId });
  } catch {}

  debuggerAttachedTabs.delete(tabId);
  executionContextsByTab.delete(tabId);
}


// 강의 종료 → Canvas 컨트롤러에 다음 강의 요청
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "LECTURE_FINISHED") return;

  const tabId = sender.tab?.id;
  if (!tabId) {
    setDebug("background 수신 실패", { error: "LECTURE_FINISHED의 tabId가 없습니다." });
    return;
  }

  setDebug("background 종료 신호 수신", {
    result: "Canvas에 ADVANCE_TO_NEXT_LECTURE 전달",
    contentId: message.contentId || null
  }).catch(() => {});

  chrome.tabs.sendMessage(tabId, {
    type: "ADVANCE_TO_NEXT_LECTURE"
  }).then(() => {
    setDebug("Canvas 이동 명령 전달 완료", {
      result: "ADVANCE_TO_NEXT_LECTURE 전송 성공"
    }).catch(() => {});
  }).catch(error => {
    setDebug("Canvas 이동 명령 전달 실패", {
      error: String(error?.message || error)
    }).catch(() => {});
  });
});


// 인페이지 UI → 큐 시작
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "ODDZ_UI_START_QUEUE") return;

  const tabId = sender.tab?.id;
  if (!tabId) {
    sendResponse({ ok: false, error: "탭을 찾지 못했습니다." });
    return false;
  }

  chrome.tabs.sendMessage(tabId, {
    type: "START_CATHOLIC_QUEUE"
  }).then(response => {
    sendResponse(response || { ok: false });
  }).catch(error => {
    sendResponse({ ok: false, error: String(error) });
  });

  return true;
});


// CMS → Chrome DevTools Protocol userGesture 재생
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "ODDZ_CDP_PLAY") return;

  const tabId = sender.tab?.id;

  if (!tabId) {
    sendResponse({
      ok: false,
      retryable: false,
      error: "CMS 탭을 찾지 못했습니다."
    });
    return false;
  }

  playCmsWithUserGesture(tabId)
    .then(sendResponse)
    .catch(error => {
      sendResponse({
        ok: false,
        retryable: true,
        error: String(error?.message || error)
      });
    });

  return true;
});


// 자동재생을 중지하면 debugger 연결도 해제한다.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  const change = changes.catholicAutoPlay;
  if (!change || change.newValue !== false) return;

  for (const tabId of [...debuggerAttachedTabs]) {
    detachDebugger(tabId);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  debuggerAttachedTabs.delete(tabId);
  executionContextsByTab.delete(tabId);
});
