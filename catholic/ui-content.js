(() => {
  if (window.top !== window) return;
  if (document.getElementById("oddz-catholic-lms-panel-host")) return;

  const HOST_ID = "oddz-catholic-lms-panel-host";
  const COURSE_LINK_SELECTOR = ".ic-DashboardCard__link";
  const ITEM_SELECTOR = ".xnlal-attendance-list-item";
  const TITLE_SELECTOR = ".xnlal-attendance-list-item-meta_data-title";
  const COLLAPSE_KEY = "oddzCatholicPanelCollapsed";

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483646";
  host.style.pointerEvents = "none";
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      :host { all: initial; }
      .wrap {
        position: fixed;
        inset: 0;
        pointer-events: none;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #1d2a3a;
      }
      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(20, 34, 55, .28);
        backdrop-filter: blur(2px);
        pointer-events: auto;
      }
      .panel {
        position: absolute;
        inset: 24px;
        background: #f5f8ff;
        border: 1px solid #dbe6f5;
        border-radius: 22px;
        box-shadow: 0 24px 70px rgba(18, 42, 79, .22);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      }
      .top {
        padding: 18px 20px 14px;
        background: white;
        border-bottom: 1px solid #e8eef7;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .brand { font-size: 24px; font-weight: 850; color: #173f84; letter-spacing: -.4px; }
      .sub { margin-top: 4px; font-size: 12px; color: #718198; }
      .top-actions { display: flex; gap: 8px; }
      button, select { font: inherit; }
      .icon-btn {
        border: 0;
        background: #eef4ff;
        color: #2459ad;
        border-radius: 11px;
        min-width: 40px;
        height: 40px;
        cursor: pointer;
        font-weight: 800;
      }
      .body {
        min-height: 0;
        flex: 1;
        padding: 14px;
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 12px;
        overflow: hidden;
      }
      .course-box {
        background: white;
        border: 1px solid #dbe6f5;
        border-radius: 16px;
        padding: 12px;
      }
      .step-head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 9px;
      }
      .step-num {
        width: 23px;
        height: 23px;
        border-radius: 8px;
        background: #2366d1;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 800;
      }
      .step-title { font-size: 14px; font-weight: 800; }
      .course-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }
      select {
        height: 40px;
        border: 1px solid #cfd9e8;
        border-radius: 10px;
        padding: 0 11px;
        background: white;
        color: #22324a;
      }
      .btn {
        border: 0;
        min-height: 40px;
        border-radius: 10px;
        padding: 0 14px;
        cursor: pointer;
        font-weight: 800;
      }
      .btn-open { background: #e8f0ff; color: #2357a4; }
      .btn-secondary { background: #eaf1fb; color: #244b83; width: 100%; }
      .btn-primary { background: #2366d1; color: white; }
      .btn-stop { background: #eef1f5; color: #4d5a6c; }

      .grid {
        min-height: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .card {
        min-height: 0;
        background: white;
        border: 1px solid #dbe6f5;
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .card-head {
        padding: 12px 14px 10px;
        border-bottom: 1px solid #edf1f7;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .card-title { font-size: 14px; font-weight: 800; }
      .count { font-size: 12px; color: #6d7d93; }
      .list {
        min-height: 0;
        flex: 1;
        overflow-y: auto;
        padding: 9px;
      }
      .list::-webkit-scrollbar { width: 8px; }
      .list::-webkit-scrollbar-thumb { background: #d9e2ef; border-radius: 99px; }
      .lecture {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        border: 1px solid #e5eaf2;
        border-radius: 12px;
        padding: 10px;
        margin-bottom: 8px;
        background: white;
        cursor: pointer;
      }
      .lecture:hover { background: #f8fbff; border-color: #aec7ef; }
      .lecture input { margin-top: 3px; accent-color: #2366d1; }
      .lecture-title, .queue-title { font-size: 13px; font-weight: 750; line-height: 1.35; }
      .meta { margin-top: 4px; font-size: 11px; color: #718198; }
      .queue {
        display: grid;
        grid-template-columns: 24px 1fr auto;
        gap: 8px;
        align-items: center;
        border: 1px solid #e5eaf2;
        border-radius: 12px;
        padding: 10px;
        margin-bottom: 8px;
      }
      .qnum {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: #edf4ff;
        color: #2559aa;
        font-size: 11px;
        font-weight: 800;
      }
      .remove {
        border: 0;
        background: transparent;
        color: #8b97a8;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 7px;
      }
      .remove:hover { background: #f2f4f7; color: #d34848; }
      .empty {
        padding: 24px 16px;
        text-align: center;
        color: #8a98ab;
        font-size: 12px;
        line-height: 1.6;
      }
      .foot {
        border-top: 1px solid #edf1f7;
        padding: 9px;
        background: #fbfcff;
      }
      .debug-box {
        border: 1px solid #d9e4f2;
        background: #ffffff;
        border-radius: 12px;
        padding: 9px 11px;
        font-size: 11px;
        line-height: 1.45;
        color: #52647b;
        max-height: 92px;
        overflow-y: auto;
      }
      .debug-title {
        font-weight: 850;
        color: #294f83;
        margin-bottom: 4px;
      }
      .debug-row {
        display: grid;
        grid-template-columns: 82px 1fr;
        gap: 8px;
      }
      .debug-key { color: #8190a2; }
      .debug-value {
        min-width: 0;
        overflow-wrap: anywhere;
        color: #33465e;
      }
      .debug-error { color: #b84242; font-weight: 750; }
      .bottom {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 9px;
        align-items: center;
      }
      .status {
        min-width: 0;
        font-size: 12px;
        color: #65758c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .playing { color: #1c7a46; font-weight: 750; }

      .dock {
        position: fixed;
        right: 18px;
        bottom: 18px;
        pointer-events: auto;
        border: 0;
        border-radius: 999px;
        height: 48px;
        padding: 0 18px;
        background: #2366d1;
        color: white;
        font-weight: 850;
        box-shadow: 0 10px 30px rgba(35, 102, 209, .3);
        cursor: pointer;
        display: none;
      }
      .collapsed .backdrop,
      .collapsed .panel { display: none; }
      .collapsed .dock { display: block; }

      @media (max-width: 900px) {
        .panel { inset: 10px; }
        .grid { grid-template-columns: 1fr; }
      }
    </style>

    <div class="wrap">
      <div class="backdrop"></div>
      <section class="panel">
        <div class="top">
          <div>
            <div class="brand">오늘의 강의</div>
            <div class="sub">과목을 고르고, 오늘 들을 강의를 한 번에 담아두세요.</div>
          </div>
          <div class="top-actions">
            <button class="icon-btn" id="refreshBtn" title="새로고침">↻</button>
            <button class="icon-btn" id="collapseBtn" title="접기">−</button>
          </div>
        </div>

        <div class="body">
          <section class="course-box">
            <div class="step-head">
              <div class="step-num">1</div>
              <div class="step-title">과목 선택</div>
            </div>
            <div class="course-row">
              <select id="courseSelect"><option>과목을 찾는 중...</option></select>
              <button class="btn btn-open" id="openCourseBtn">강의/출결 열기</button>
            </div>
          </section>

          <div class="grid">
            <section class="card">
              <div class="card-head">
                <div class="card-title">2. 영상 선택</div>
                <div class="count" id="lectureCount">0개</div>
              </div>
              <div class="list" id="lectureList">
                <div class="empty">과목을 선택하면 영상 목록이 자동으로 나타납니다.</div>
              </div>
              <div class="foot">
                <button class="btn btn-secondary" id="addBtn">선택한 강의를 오늘 목록에 추가</button>
              </div>
            </section>

            <section class="card">
              <div class="card-head">
                <div class="card-title">3. 오늘 재생할 목록</div>
                <div class="count" id="queueCount">0개</div>
              </div>
              <div class="list" id="queueList">
                <div class="empty">과목이 달라도 같은 목록에 담을 수 있습니다.</div>
              </div>
            </section>
          </div>

          <div class="debug-box" id="debugBox">
            <div class="debug-title">진단 상태 · v0.6.8</div>
            <div class="debug-row"><div class="debug-key">단계</div><div class="debug-value" id="debugStep">대기 중</div></div>
            <div class="debug-row"><div class="debug-key">현재 항목</div><div class="debug-value" id="debugCurrent">-</div></div>
            <div class="debug-row"><div class="debug-key">다음 항목</div><div class="debug-value" id="debugNext">-</div></div>
            <div class="debug-row"><div class="debug-key">마지막 결과</div><div class="debug-value" id="debugResult">-</div></div>
          </div>

          <div class="bottom">
            <div class="status" id="status">준비 중</div>
            <button class="btn btn-stop" id="stopBtn">중지</button>
            <button class="btn btn-primary" id="startBtn">전체 시작</button>
          </div>
        </div>
      </section>

      <button class="dock" id="dockBtn" title="오늘의 강의 펼치기">▶</button>
    </div>
  `;

  const $ = id => root.getElementById(id);
  const wrap = root.querySelector(".wrap");
  const courseSelect = $("courseSelect");
  const lectureList = $("lectureList");
  const queueList = $("queueList");
  const lectureCount = $("lectureCount");
  const queueCount = $("queueCount");
  const status = $("status");

  let currentContext = null;
  let courseCatalog = [];

  function esc(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function setStatus(text, playing = false) {
    status.textContent = text;
    status.classList.toggle("playing", playing);
  }


  async function renderDebugState() {
    try {
      const state = await chrome.storage.local.get([
        "catholicDebugState",
        "catholicQueue",
        "catholicQueuePos"
      ]);

      const d = state.catholicDebugState || {};
      const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];
      const pos = Number(state.catholicQueuePos);

      const current = Number.isInteger(pos) && queue[pos]
        ? `${pos + 1}. ${queue[pos].title}`
        : (d.currentTitle || "-");

      const next = Number.isInteger(pos) && queue[pos + 1]
        ? `${pos + 2}. ${queue[pos + 1].title}`
        : (d.nextTitle || "-");

      $("debugStep").textContent = d.step || "대기 중";
      $("debugCurrent").textContent = current;
      $("debugNext").textContent = next;

      const resultEl = $("debugResult");
      const result = d.error || d.result || d.detail || "-";
      resultEl.textContent = result;
      resultEl.classList.toggle("debug-error", Boolean(d.error));
    } catch {}
  }

  function getToolDoc() {
    const frame = document.querySelector('iframe[name="tool_content"]');
    try { return frame?.contentDocument || null; }
    catch { return null; }
  }

  function readDashboardCourses() {
    const seen = new Set();
    const list = [];

    for (const link of document.querySelectorAll(COURSE_LINK_SELECTOR)) {
      const href = link.href || "";
      const m = href.match(/\/courses\/(\d+)/);
      const id = m?.[1];
      if (!id || seen.has(id)) continue;

      const name = (link.innerText || "").replace(/\s+/g, " ").trim();
      if (!name) continue;

      seen.add(id);
      list.push({
        courseId: id,
        courseName: name,
        courseHomeUrl: `https://canvas.catholic.ac.kr/courses/${id}`,
        courseLectureUrl: `https://canvas.catholic.ac.kr/courses/${id}/external_tools/20`
      });
    }

    return list;
  }

  function readCourseContext() {
    const doc = getToolDoc();
    if (!doc) return null;

    const rootEl = doc.querySelector("#root");
    const courseId = rootEl?.dataset?.course_id;
    const courseName = rootEl?.dataset?.course_name;

    const items = [...doc.querySelectorAll(ITEM_SELECTOR)];
    if (!courseId || !items.length) return null;

    const lectures = items.map((item, index) => ({
      index,
      title: item.querySelector(TITLE_SELECTOR)?.innerText?.trim() || `강의 ${index + 1}`
    }));

    return {
      courseId: String(courseId),
      courseName: courseName || `과목 ${courseId}`,
      courseUrl: `https://canvas.catholic.ac.kr/courses/${courseId}/external_tools/20`,
      lectures
    };
  }

  async function loadCourses() {
    const current = readDashboardCourses();
    if (current.length) {
      courseCatalog = current;
      await chrome.storage.local.set({ catholicCourseCatalog: current });
    } else {
      const state = await chrome.storage.local.get(["catholicCourseCatalog"]);
      courseCatalog = Array.isArray(state.catholicCourseCatalog) ? state.catholicCourseCatalog : [];
    }

    courseSelect.innerHTML = "";

    if (!courseCatalog.length) {
      courseSelect.innerHTML = `<option value="">대시보드에서 과목 목록을 먼저 읽어주세요</option>`;
      return;
    }

    for (const course of courseCatalog) {
      const opt = document.createElement("option");
      opt.value = course.courseId;
      opt.textContent = course.courseName;
      courseSelect.appendChild(opt);
    }

    if (currentContext?.courseId) {
      courseSelect.value = currentContext.courseId;
    }
  }

  function renderLectures() {
    const lectures = currentContext?.lectures || [];
    lectureCount.textContent = `${lectures.length}개`;

    if (!lectures.length) {
      lectureList.innerHTML = `<div class="empty">선택한 과목의 강의 목록을 기다리는 중입니다.</div>`;
      return;
    }

    lectureList.innerHTML = lectures.map(x => `
      <label class="lecture">
        <input type="checkbox" data-index="${x.index}">
        <div>
          <div class="lecture-title">${esc(x.title)}</div>
          <div class="meta">${x.index + 1}차시</div>
        </div>
      </label>
    `).join("");
  }

  async function loadQueue() {
    const state = await chrome.storage.local.get([
      "catholicQueue", "catholicAutoPlay", "catholicQueuePos"
    ]);

    const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];
    const pos = Number(state.catholicQueuePos);
    queueCount.textContent = `${queue.length}개`;

    if (!queue.length) {
      queueList.innerHTML = `<div class="empty">과목이 달라도 같은 목록에 담을 수 있습니다.</div>`;
    } else {
      queueList.innerHTML = queue.map((item, i) => `
        <div class="queue">
          <div class="qnum">${i + 1}</div>
          <div>
            <div class="queue-title">${esc(item.title)}</div>
            <div class="meta">${esc(item.courseName)}${state.catholicAutoPlay && i === pos ? " · 현재 항목" : ""}</div>
          </div>
          <button class="remove" data-remove="${i}">✕</button>
        </div>
      `).join("");

      queueList.querySelectorAll("[data-remove]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const s = await chrome.storage.local.get(["catholicQueue", "catholicAutoPlay"]);
          if (s.catholicAutoPlay) {
            setStatus("재생 중에는 목록을 수정할 수 없습니다.");
            return;
          }
          const q = Array.isArray(s.catholicQueue) ? s.catholicQueue : [];
          q.splice(Number(btn.dataset.remove), 1);
          await chrome.storage.local.set({ catholicQueue: q });
          await loadQueue();
        });
      });
    }

    if (state.catholicAutoPlay && Number.isInteger(pos) && queue[pos]) {
      setStatus(`자동재생 진행 · ${queue[pos].courseName} · ${queue[pos].title}`, true);
    }
  }

  function contextSignature(ctx) {
    if (!ctx) return "";
    return JSON.stringify({
      courseId: ctx.courseId,
      courseName: ctx.courseName,
      lectures: ctx.lectures.map(x => [x.index, x.title])
    });
  }

  async function refreshContext({quiet = false} = {}) {
    const next = readCourseContext();

    if (next) {
      const before = contextSignature(currentContext);
      const after = contextSignature(next);
      const changed = before !== after;

      currentContext = next;

      if (changed) {
        await loadCourses();
        renderLectures();
        if (!quiet) setStatus(`${next.courseName} · 강의를 선택하세요.`);
      }

      return true;
    }

    return false;
  }

  async function waitForCourseContext(courseId) {
    setStatus("강의 목록을 불러오는 중...");
    for (let i = 0; i < 80; i++) {
      const ok = await refreshContext({ quiet: true });
      if (ok && String(currentContext.courseId) === String(courseId)) {
        setStatus(`${currentContext.courseName} · 강의를 선택하세요.`);
        return true;
      }
      await sleep(250);
    }
    setStatus("강의 목록을 불러오지 못했습니다. 새로고침 버튼을 눌러주세요.");
    return false;
  }

  $("openCourseBtn").addEventListener("click", async () => {
    const courseId = courseSelect.value;
    if (!courseId) {
      setStatus("과목을 선택해주세요.");
      return;
    }

    // Panel state stays collapsed/open across same-tab navigation via sessionStorage.
    sessionStorage.setItem("oddzPendingCourse", courseId);
    location.href = `https://canvas.catholic.ac.kr/courses/${courseId}/external_tools/20`;
  });

  $("addBtn").addEventListener("click", async () => {
    if (!currentContext) {
      setStatus("강의 목록이 아직 준비되지 않았습니다.");
      return;
    }

    const checked = [...lectureList.querySelectorAll('input[type="checkbox"]:checked')];
    if (!checked.length) {
      setStatus("추가할 강의를 선택해주세요.");
      return;
    }

    const state = await chrome.storage.local.get(["catholicQueue", "catholicAutoPlay"]);
    if (state.catholicAutoPlay) {
      setStatus("재생 중에는 목록을 수정할 수 없습니다.");
      return;
    }

    const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];

    for (const input of checked) {
      const idx = Number(input.dataset.index);
      const lec = currentContext.lectures.find(x => x.index === idx);
      if (!lec) continue;

      const key = `${currentContext.courseId}:${idx}`;
      if (!queue.some(x => x.key === key)) {
        queue.push({
          key,
          courseId: currentContext.courseId,
          courseName: currentContext.courseName,
          courseUrl: currentContext.courseUrl,
          lectureIndex: idx,
          title: lec.title
        });
      }
      input.checked = false;
    }

    await chrome.storage.local.set({ catholicQueue: queue });
    await loadQueue();
    setStatus("오늘 재생할 목록에 추가했습니다.");
  });

  $("startBtn").addEventListener("click", async () => {
    const state = await chrome.storage.local.get(["catholicQueue"]);
    const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];

    if (!queue.length) {
      setStatus("오늘 재생할 목록이 비어 있습니다.");
      return;
    }

    // Ask the existing canvas-content.js to start the queue.
    try {
      const response = await chrome.runtime.sendMessage({
        type: "ODDZ_UI_START_QUEUE"
      });
      if (response?.ok) {
        setStatus("오늘의 강의 재생을 시작했습니다.", true);
        return;
      }
    } catch {}

    // Fallback: implement first-queue navigation here.
    const item = queue[0];
    await chrome.storage.local.set({
      catholicAutoPlay: true,
      catholicQueuePos: 0,
      catholicCurrentIndex: item.lectureIndex,
      catholicPendingOpen: {
        courseId: String(item.courseId),
        lectureIndex: Number(item.lectureIndex),
        queuePos: 0
      }
    });
    location.href = item.courseUrl;
  });

  $("stopBtn").addEventListener("click", async () => {
    await chrome.storage.local.set({
      catholicAutoPlay: false,
      catholicPendingOpen: null,
      catholicQueuePos: null
    });
    setStatus("자동 재생을 중지했습니다.");
    await loadQueue();
  });

  $("refreshBtn").addEventListener("click", async () => {
    await loadCourses();
    const ok = await refreshContext();
    if (!ok) setStatus("현재 화면에서 강의 목록을 찾지 못했습니다.");
  });

  function setCollapsed(collapsed) {
    wrap.classList.toggle("collapsed", collapsed);
  }

  $("collapseBtn").addEventListener("click", () => setCollapsed(true));
  $("dockBtn").addEventListener("click", () => setCollapsed(false));

  // 페이지 진입/새로고침/확장프로그램 재로드 시에는 항상 전체 화면으로 시작한다.
  // 접힘 상태는 같은 페이지 세션에 남기지 않는다.
  try {
    sessionStorage.removeItem(COLLAPSE_KEY);
  } catch {}
  setCollapsed(false);
  renderDebugState().catch(() => {});

  // Keep queue rendering in sync if another content script updates storage.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (
      changes.catholicQueue ||
      changes.catholicAutoPlay ||
      changes.catholicQueuePos ||
      changes.catholicDebugState
    ) {
      loadQueue().catch(() => {});
      renderDebugState().catch(() => {});
    }
  });

  // 새로고침 없이 동작하도록 URL/iframe/DOM 변화를 모두 감시한다.
  let refreshTimer = null;
  let lastHref = location.href;
  let lastFrame = null;
  let lastFrameHref = "";

  const scheduleRefresh = (delay = 120, noisy = false) => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      await loadCourses().catch(() => {});
      const ok = await refreshContext({ quiet: !noisy }).catch(() => false);

      if (!ok && noisy) {
        setStatus("강의 목록을 기다리는 중...");
      }
    }, delay);
  };

  const observer = new MutationObserver(() => scheduleRefresh(120, false));
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Canvas/LearningX가 history API로 이동하는 경우에도 갱신 신호를 발생시킨다.
  const notifyRouteChange = () => {
    window.dispatchEvent(new Event("oddz-route-change"));
  };

  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    const result = originalPushState.apply(this, args);
    notifyRouteChange();
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    const result = originalReplaceState.apply(this, args);
    notifyRouteChange();
    return result;
  };

  window.addEventListener("popstate", notifyRouteChange);

  window.addEventListener("oddz-route-change", () => {
    setTimeout(() => scheduleRefresh(50, true), 0);
    setTimeout(() => scheduleRefresh(500, true), 500);
    setTimeout(() => scheduleRefresh(1500, true), 1500);
  });

  // 폴링은 MutationObserver가 놓치는 iframe 내부 비동기 로딩을 보완한다.
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      scheduleRefresh(50, true);
    }

    const frame = document.querySelector('iframe[name="tool_content"]');

    if (frame !== lastFrame) {
      lastFrame = frame;
      lastFrameHref = "";

      if (frame) {
        frame.addEventListener("load", () => {
          scheduleRefresh(150, true);
          setTimeout(() => scheduleRefresh(700, true), 700);
          setTimeout(() => scheduleRefresh(1800, true), 1800);
        });
      }

      scheduleRefresh(80, true);
    }

    if (frame) {
      let href = "";
      try {
        href = frame.contentWindow?.location?.href || "";
      } catch {}

      if (href && href !== lastFrameHref) {
        lastFrameHref = href;
        scheduleRefresh(80, true);
      }
    }

    // 현재 강의 정보가 없으면 계속 재시도한다.
    if (!currentContext) {
      refreshContext({ quiet: true }).catch(() => {});
    }
  }, 500);

  (async () => {
    await loadCourses();
    await loadQueue();

    const pendingCourse = sessionStorage.getItem("oddzPendingCourse");

    if (pendingCourse) {
      const ok = await waitForCourseContext(pendingCourse);
      if (ok) {
        sessionStorage.removeItem("oddzPendingCourse");
      } else {
        setStatus("강의 목록을 계속 기다리는 중입니다...");
      }
    } else {
      const ok = await refreshContext();
      if (!ok) {
        setStatus("대시보드에서 과목을 선택하거나, 과목의 강의/출결을 열어주세요.");
      }
    }
  })();
})();
