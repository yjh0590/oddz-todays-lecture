(() => {
  const ITEM_SELECTOR = ".xnlal-attendance-list-item";
  const TITLE_SELECTOR = ".xnlal-attendance-list-item-meta_data-title";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


  async function setDebug(step, extra = {}) {
    try {
      await chrome.storage.local.set({
        catholicDebugState: {
          step,
          at: Date.now(),
          href: location.href,
          ...extra
        }
      });
    } catch {}
  }

  async function bumpAutoPlayGeneration() {
    const state = await chrome.storage.local.get(["catholicAutoPlayGeneration"]);
    const next = (Number(state.catholicAutoPlayGeneration) || 0) + 1;

    await chrome.storage.local.set({
      catholicAutoPlayGeneration: next
    });

    console.log("[오늘의 강의] 새 강의 자동재생 세대:", next);
    return next;
  }


  function getToolFrame() {
    return document.querySelector('iframe[name="tool_content"]');
  }

  function getToolDocument() {
    const frame = getToolFrame();
    try {
      return frame?.contentDocument || null;
    } catch {
      return null;
    }
  }

  function getDashboardCourses() {
    const links = [...document.querySelectorAll(".ic-DashboardCard__link")];

    const seen = new Set();
    const courses = [];

    for (const link of links) {
      const href = link.href || "";
      const match = href.match(/\/courses\/(\d+)/);
      const courseId = match?.[1];
      if (!courseId || seen.has(courseId)) continue;

      const rawText = (link.innerText || "").replace(/\s+/g, " ").trim();
      if (!rawText) continue;

      seen.add(courseId);

      courses.push({
        courseId,
        courseName: rawText,
        courseHomeUrl: `https://canvas.catholic.ac.kr/courses/${courseId}`,
        courseLectureUrl: `https://canvas.catholic.ac.kr/courses/${courseId}/external_tools/20`
      });
    }

    return courses;
  }

  async function cacheDashboardCourses() {
    const courses = getDashboardCourses();
    if (courses.length) {
      await chrome.storage.local.set({ catholicCourseCatalog: courses });
    }
    return courses;
  }

  function getRootData() {
    const doc = getToolDocument();
    const root = doc?.querySelector("#root");
    return {
      courseId: root?.dataset?.course_id || null,
      courseName: root?.dataset?.course_name || document.title || "현재 과목"
    };
  }

  function getLectureItems() {
    const doc = getToolDocument();
    if (!doc) return [];
    return [...doc.querySelectorAll(ITEM_SELECTOR)];
  }

  function getLectureTitles() {
    return getLectureItems().map((item, index) => ({
      index,
      title:
        item.querySelector(TITLE_SELECTOR)?.innerText?.trim() ||
        `강의 ${index + 1}`
    }));
  }

  function getCourseContext() {
    const { courseId, courseName } = getRootData();
    const lectures = getLectureTitles();

    return {
      ok: Boolean(courseId && lectures.length),
      courseId,
      courseName,
      courseUrl: courseId
        ? `https://canvas.catholic.ac.kr/courses/${courseId}/external_tools/20`
        : location.href,
      lectures
    };
  }

  function suppressBeforeUnloadForAutoMove() {
    try {
      document.dispatchEvent(new CustomEvent("ODDZ_SUPPRESS_BEFOREUNLOAD"));
    } catch {}

    try {
      const toolDoc = getToolDocument();
      toolDoc?.dispatchEvent(new CustomEvent("ODDZ_SUPPRESS_BEFOREUNLOAD"));
    } catch {}
  }

  function findBackToListControl(doc) {
    const all = [...doc.querySelectorAll("button, a, [role='button'], [tabindex], div, span, p")];

    // "목록으로 이동" 전체 문구가 정확히 들어있는 가장 작은 요소를 우선.
    const exact = all
      .filter(el =>
        (el.innerText || "").replace(/\s+/g, " ").trim() === "목록으로 이동"
      )
      .sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length);

    return exact[0] || null;
  }

  async function waitForLectureList(timeoutMs = 12000) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const items = getLectureItems();

      if (items.length) {
        // React 목록이 화면에 나타난 직후 클릭하면 씹히는 경우가 있어
        // 한 번 더 렌더 안정화 시간을 준 뒤 새 DOM을 다시 읽는다.
        await sleep(900);
        const fresh = getLectureItems();
        if (fresh.length) return fresh;
      }

      await sleep(250);
    }

    return [];
  }

  async function ensureLectureList() {
    let items = getLectureItems();
    if (items.length) {
      await setDebug("강의 목록 확인 완료", { result: `${items.length}개 항목 발견` });
      return items;
    }

    await setDebug("목록으로 복귀 시도", { result: "현재 상세 화면에서 목록 버튼 탐색" });

    const doc = getToolDocument();
    if (!doc) return [];

    const back = findBackToListControl(doc);
    if (!back) {
      console.warn("[오늘의 강의] 목록으로 이동 요소를 찾지 못했습니다.");
      await setDebug("목록 복귀 실패", { error: "목록으로 이동 요소를 찾지 못했습니다." });
      return [];
    }

    await setDebug("목록으로 이동 클릭", { result: "목록 버튼 발견" });
    back.click();
    const result = await waitForLectureList();

    await setDebug(
      result.length ? "목록 복귀 완료" : "목록 복귀 실패",
      result.length
        ? { result: `${result.length}개 강의 항목 발견` }
        : { error: "목록 클릭 후 강의 항목이 나타나지 않았습니다." }
    );

    return result;
  }

  async function clickLecture(index) {
    let items = getLectureItems();

    if (!items.length) {
      items = await waitForLectureList(15000);
    }

    const target = items[index];

    if (!target) {
      await setDebug("강의 클릭 실패", {
        error: `강의 항목 index=${index} 를 찾지 못했습니다.`,
        itemCount: items.length
      });
      return { ok: false, error: "강의 항목을 찾지 못했습니다." };
    }

    const title =
      target.querySelector(TITLE_SELECTOR)?.innerText?.trim() ||
      `강의 ${index + 1}`;

    console.log("[오늘의 강의] 강의 단일 click()", {
      index,
      title
    });

    // 핵심:
    // 사용자가 콘솔에서 성공했던 것과 똑같이 딱 한 번만 click().
    // 상세 화면이 열리는 동안 목록 DOM이 잠깐 남아 있을 수 있으므로
    // DOM이 사라졌는지 검사하거나 재클릭하지 않는다.
    await setDebug("강의 항목 클릭", {
      result: title,
      lectureIndex: index
    });

    target.click();

    return { ok: true, title };
  }

  async function openQueueItem(pos) {
    const state = await chrome.storage.local.get(["catholicQueue"]);
    const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];
    const item = queue[pos];

    if (item) {
      await setDebug("재생 항목 열기", {
        currentTitle: item.title,
        result: `${pos + 1}번째 항목`,
        queuePos: pos
      });
    }

    if (!item) {
      await chrome.storage.local.set({
        catholicAutoPlay: false,
        catholicQueuePos: null,
        catholicPendingOpen: null
      });
      return { ok: false, error: "재생할 강의가 없습니다." };
    }

    await chrome.storage.local.set({
      catholicAutoPlay: true
    });

    const current = getRootData();

    if (String(current.courseId) !== String(item.courseId)) {
      await chrome.storage.local.set({
        catholicPendingOpen: {
          courseId: String(item.courseId),
          lectureIndex: Number(item.lectureIndex),
          queuePos: pos
        }
      });

      suppressBeforeUnloadForAutoMove();
      await sleep(100);
      location.href = item.courseUrl;
      return { ok: true, navigating: true };
    }

    // v0.6.9:
    // 같은 과목의 다음 강의에서도 "목록으로 이동" 버튼을 누르지 않는다.
    // UniPlayer/LearningX가 종료 직후 React 화면을 교체하는 타이밍에
    // 목록 버튼 click()이 씹히는 경우가 확인됐다.
    //
    // 대신 다음 항목을 pending으로 저장한 뒤 현재 강의/출결 페이지를
    // 통째로 새로고침한다. 새 문서에서 resumePendingIfNeeded()가
    // 목록이 완전히 준비된 후 정확한 강의를 한 번 클릭한다.
    await chrome.storage.local.set({
      catholicPendingOpen: {
        courseId: String(item.courseId),
        lectureIndex: Number(item.lectureIndex),
        queuePos: pos
      }
    });

    await setDebug("같은 과목 목록 재로딩", {
      currentTitle: item.title,
      result: "목록 버튼 대신 강의/출결 페이지 새로고침"
    });

    suppressBeforeUnloadForAutoMove();
    await sleep(150);

    location.reload();

    return { ok: true, navigating: true, reload: true };
  }

  async function startQueue() {
    const state = await chrome.storage.local.get(["catholicQueue"]);
    const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];

    if (!queue.length) {
      return { ok: false, error: "오늘 재생할 목록이 비어 있습니다." };
    }

    return await openQueueItem(0);
  }

  async function stopAutoPlay() {
    await chrome.storage.local.set({
      catholicAutoPlay: false,
      catholicPendingOpen: null
    });
  }

  let advanceInProgress = false;

  async function advanceQueue() {
    if (advanceInProgress) {
      console.log("[오늘의 강의] 다음 강의 이동 중복 요청 무시");
      await setDebug("중복 이동 요청 무시", { result: "이미 다음 강의 이동 처리 중" });
      return;
    }

    advanceInProgress = true;

    try {
      const state = await chrome.storage.local.get([
      "catholicAutoPlay",
      "catholicQueue",
      "catholicQueuePos"
    ]);

    if (!state.catholicAutoPlay) return;

    const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];
    const pos = Number(state.catholicQueuePos);

    if (!Number.isInteger(pos)) return;

    const nextPos = pos + 1;

    await setDebug("다음 강의 이동 시작", {
      currentTitle: queue[pos]?.title || "-",
      nextTitle: queue[nextPos]?.title || "-",
      result: `${pos + 1} → ${nextPos + 1}`
    });

    if (nextPos >= queue.length) {
      await stopAutoPlay();
      await chrome.storage.local.set({ catholicQueuePos: null });
      console.log("[오늘의 강의] 오늘 재생할 목록을 모두 완료했습니다.");
      return;
    }

    // LMS가 본편 종료 상태/출결을 반영할 시간을 둔다.
    await sleep(3000);

    suppressBeforeUnloadForAutoMove();
    await sleep(150);

      const result = await openQueueItem(nextPos);
      console.log("[오늘의 강의] 다음 강의 이동 결과", result);

      await setDebug(
        result?.ok ? "다음 강의 이동 요청 성공" : "다음 강의 이동 실패",
        result?.ok
          ? {
              currentTitle: queue[nextPos]?.title || "-",
              nextTitle: queue[nextPos + 1]?.title || "-",
              result: result?.navigating ? "다른 과목으로 이동 중" : "다음 강의 click() 완료"
            }
          : {
              currentTitle: queue[pos]?.title || "-",
              nextTitle: queue[nextPos]?.title || "-",
              error: result?.error || "알 수 없는 이동 오류"
            }
      );
    } finally {
      // 페이지 이동이 일어나는 경우 새 문서가 이 상태를 새로 갖게 되고,
      // 같은 문서 안에서라면 충분한 시간 뒤 중복 잠금을 풀어준다.
      setTimeout(() => {
        advanceInProgress = false;
      }, 5000);
    }
  }

  async function resumePendingIfNeeded() {
    // 페이지/iframe이 완전히 준비될 때까지 기다린다.
    for (let i = 0; i < 50; i++) {
      const state = await chrome.storage.local.get([
        "catholicAutoPlay",
        "catholicPendingOpen",
        "catholicQueuePos"
      ]);

      if (!state.catholicAutoPlay || !state.catholicPendingOpen) return;

      const current = getRootData();
      const pending = state.catholicPendingOpen;

      if (
        current.courseId &&
        String(current.courseId) === String(pending.courseId)
      ) {
        await setDebug("재로딩 후 목록 대기", {
          result: `course ${pending.courseId} · lecture index ${pending.lectureIndex}`
        });

        const items = await waitForLectureList(15000);

        if (items.length) {
          await setDebug("재로딩 후 목록 준비 완료", {
            result: `${items.length}개 강의 항목 발견`
          });

          await chrome.storage.local.set({ catholicPendingOpen: null });

          const result = await clickLecture(Number(pending.lectureIndex));

          if (result?.ok) {
            const state = await chrome.storage.local.get(["catholicQueue"]);
            const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];
            const item = queue[Number(pending.queuePos)];

            await chrome.storage.local.set({
              catholicQueuePos: Number(pending.queuePos),
              catholicCurrentIndex: Number(pending.lectureIndex)
            });

            await setDebug("다음 강의 진입 완료", {
              currentTitle: item?.title || "-",
              nextTitle: queue[Number(pending.queuePos) + 1]?.title || "-",
              result: `queue ${Number(pending.queuePos) + 1}번 항목 click() 완료`
            });
          } else {
            await setDebug("재로딩 후 강의 클릭 실패", {
              error: result?.error || "알 수 없는 오류"
            });
          }

          return;
        }

        await setDebug("재로딩 후 목록 대기 실패", {
          error: "15초 동안 강의 목록이 나타나지 않았습니다."
        });
      }

      await sleep(300);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "GET_CATHOLIC_DASHBOARD_COURSES") {
      (async () => {
        try {
          const current = await cacheDashboardCourses();
          const state = await chrome.storage.local.get(["catholicCourseCatalog"]);
          const courses = current.length
            ? current
            : (Array.isArray(state.catholicCourseCatalog) ? state.catholicCourseCatalog : []);

          sendResponse({
            ok: courses.length > 0,
            courses
          });
        } catch (error) {
          sendResponse({ ok: false, courses: [], error: String(error) });
        }
      })();
      return true;
    }

    if (message?.type === "OPEN_CATHOLIC_COURSE") {
      const courseId = String(message.courseId || "");
      if (!/^\d+$/.test(courseId)) {
        sendResponse({ ok: false, error: "과목 ID가 올바르지 않습니다." });
        return false;
      }

      sendResponse({ ok: true });

      setTimeout(() => {
        location.href =
          `https://canvas.catholic.ac.kr/courses/${courseId}/external_tools/20`;
      }, 100);

      return false;
    }

    if (message?.type === "GET_CATHOLIC_COURSE_CONTEXT") {
      sendResponse(getCourseContext());
      return false;
    }

    if (message?.type === "START_CATHOLIC_QUEUE") {
      startQueue()
        .then(sendResponse)
        .catch(error => sendResponse({ ok: false, error: String(error) }));
      return true;
    }

    if (message?.type === "STOP_CATHOLIC_AUTOPLAY") {
      stopAutoPlay()
        .then(() => sendResponse({ ok: true }))
        .catch(error => sendResponse({ ok: false, error: String(error) }));
      return true;
    }

    if (message?.type === "ADVANCE_TO_NEXT_LECTURE") {
      advanceQueue().catch(console.error);
      return false;
    }
  });

  // 대시보드에서 과목 목록을 발견하면 캐시해둔다.
  setTimeout(() => {
    cacheDashboardCourses().catch(() => {});
  }, 500);

  // 다른 과목으로 자동 이동한 뒤 이어서 해당 강의를 연다.
  setTimeout(() => {
    resumePendingIfNeeded().catch(console.error);
  }, 700);
})();
