(() => {
  if (window.__oddzCatholicCmsInstalled) return;
  window.__oddzCatholicCmsInstalled = true;

  const MIN_MAIN_VIDEO_DURATION = 60;

  const CHECK_MS = 300;
  const PLAYER_SETTLE_MS = 800;
  const REQUEST_RETRY_MS = 900;
  const MAX_REQUESTS = 15;

  const contentId =
    location.pathname.match(/\/em\/([^/?#]+)/)?.[1] || null;

  let autoplayEnabledCache = false;
  let playerSeenAt = null;
  let lastRequestAt = 0;
  let requestCount = 0;
  let requestPending = false;
  let playCommandAccepted = false;

  let watchedVideo = null;
  let finishSent = false;
  let firstObservedTime = 0;
  let maxObservedTime = 0;
  let realProgressObserved = false;


  async function setDebug(step, extra = {}) {
    try {
      await chrome.storage.local.set({
        catholicDebugState: {
          step,
          at: Date.now(),
          href: location.href,
          contentId,
          ...extra
        }
      });
    } catch {}
  }

  async function refreshAutoPlayState() {
    try {
      const state = await chrome.storage.local.get(["catholicAutoPlay"]);
      autoplayEnabledCache = Boolean(state.catholicAutoPlay);
    } catch {
      autoplayEnabledCache = false;
    }
  }

  function hasPlayerSurface() {
    return Boolean(
      document.querySelector(".vc-front-screen-play-btn") ||
      [...document.querySelectorAll("video")].some(v => {
        const src = v.currentSrc || v.src || "";
        return src.includes("preloader.mp4");
      })
    );
  }

  function getMainVideo() {
    return [...document.querySelectorAll("video")]
      .filter(v => {
        const src = v.currentSrc || v.src || "";

        return (
          !src.includes("preloader.mp4") &&
          Number.isFinite(v.duration) &&
          v.duration >= MIN_MAIN_VIDEO_DURATION &&
          v.readyState >= 1 &&
          Boolean(src)
        );
      })
      .sort((a, b) => b.duration - a.duration)[0] || null;
  }

  async function requestTrustedPlay() {
    if (requestPending || playCommandAccepted) return;

    const now = Date.now();

    if (now - lastRequestAt < REQUEST_RETRY_MS) return;
    if (requestCount >= MAX_REQUESTS) return;

    requestPending = true;
    lastRequestAt = now;
    requestCount += 1;

    console.log("[오늘의 강의] 브라우저 레벨 UniPlayer 재생 요청", {
      contentId,
      attempt: requestCount
    });
    await setDebug("영상 재생 요청", { result: `CDP 재생 시도 ${requestCount}회` });

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ODDZ_CDP_PLAY",
        contentId
      });

      if (response?.ok) {
        playCommandAccepted = true;

        await setDebug("영상 재생 명령 성공", { result: "UniPlayer PLAY_SELECTED 전달 완료" });

        console.log("[오늘의 강의] userGesture 재생 명령 성공", {
          contentId,
          attempt: requestCount,
          href: response.href || null,
          hasBeenActive: response.hasBeenActive,
          isActive: response.isActive
        });
      } else {
        console.log("[오늘의 강의] userGesture 재생 대기/실패", {
          contentId,
          attempt: requestCount,
          error: response?.error || "알 수 없는 오류"
        });
      }
    } catch (error) {
      console.log("[오늘의 강의] userGesture 재생 요청 오류", {
        contentId,
        attempt: requestCount,
        error: String(error?.message || error)
      });
    } finally {
      requestPending = false;
    }
  }

  async function handleAutoplay() {
    if (!autoplayEnabledCache || playCommandAccepted) return;

    if (!hasPlayerSurface()) {
      playerSeenAt = null;
      return;
    }

    const now = Date.now();

    if (playerSeenAt === null) {
      playerSeenAt = now;
      return;
    }

    if (now - playerSeenAt < PLAYER_SETTLE_MS) return;

    // 일반 .click(), dispatchEvent(), video.play()가 아니라
    // background에서 CDP Runtime.evaluate(userGesture=true)를 사용한다.
    await requestTrustedPlay();
  }

  let nearEndSeenAt = null;

  function sendLectureFinished(video, reason) {
    if (finishSent) return;
    if (!video) return;

    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration < MIN_MAIN_VIDEO_DURATION) return;
    if (!realProgressObserved) return;

    // UniPlayer는 영상 종료 직후 currentTime을 0 또는 다른 값으로 되돌릴 수 있다.
    // 따라서 '종료 이벤트가 발생한 순간의 currentTime'만 보지 않고,
    // 재생 중 실제로 관찰했던 가장 큰 시간(maxObservedTime)을 기준으로 판단한다.
    const reachedRealEnd =
      maxObservedTime >= Math.max(0, duration - 2.5);

    if (!reachedRealEnd) return;

    finishSent = true;

    setDebug("본편 종료 감지 완료", {
      result: `다음 강의 요청 예약 (${reason})`
    }).catch(() => {});

    console.log("[오늘의 강의] 본편 종료 → 다음 강의 요청", {
      contentId,
      reason,
      currentTime: video.currentTime,
      maxObservedTime,
      duration
    });

    setTimeout(() => {
      document.dispatchEvent(
        new CustomEvent("ODDZ_SUPPRESS_BEFOREUNLOAD")
      );

      setDebug("다음 강의 요청 전송", {
        result: "LECTURE_FINISHED → background"
      }).catch(() => {});

      chrome.runtime.sendMessage({
        type: "LECTURE_FINISHED",
        title: document.title,
        currentTime: Number.isFinite(video.currentTime)
          ? video.currentTime
          : maxObservedTime,
        maxObservedTime,
        duration,
        contentId,
        reason
      }).catch(() => {});
    }, 3000);
  }

  function attachFinishWatcher() {
    const video = getMainVideo();
    if (!video) return;

    if (video !== watchedVideo) {
      watchedVideo = video;
      finishSent = false;
      nearEndSeenAt = null;
      firstObservedTime =
        Number.isFinite(video.currentTime) ? video.currentTime : 0;
      maxObservedTime = firstObservedTime;
      realProgressObserved = false;

      console.log("[오늘의 강의] 본편 종료 감시 연결", {
        contentId,
        duration: video.duration,
        currentTime: video.currentTime
      });
      setDebug("본편 재생 감시 중", {
        result: `duration=${Math.round(video.duration)}초`
      }).catch(() => {});

      video.addEventListener("timeupdate", () => {
        if (!Number.isFinite(video.currentTime)) return;

        maxObservedTime = Math.max(maxObservedTime, video.currentTime);

        if (maxObservedTime - firstObservedTime >= 5) {
          realProgressObserved = true;
        }

        const duration = Number(video.duration);
        if (
          Number.isFinite(duration) &&
          duration >= MIN_MAIN_VIDEO_DURATION &&
          maxObservedTime >= Math.max(0, duration - 2.5)
        ) {
          nearEndSeenAt ??= Date.now();
        }
      });

      video.addEventListener("ended", () => {
        // 기존 v0.6.6은 여기서 video.currentTime이 duration-1.5 이상인지 검사했다.
        // UniPlayer가 ended 직후 currentTime을 재설정하면 이 조건이 실패해서
        // 다음 강의로 넘어가지 못할 수 있었다.
        sendLectureFinished(video, "ended-event");
      });
    }

    // ended 이벤트를 UniPlayer가 전달하지 않거나, 종료 직후 video 상태를
    // 교체하는 경우를 대비한 보조 감시.
    if (finishSent || !realProgressObserved) return;

    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration < MIN_MAIN_VIDEO_DURATION) return;

    const nearEnd =
      maxObservedTime >= Math.max(0, duration - 2.5);

    if (!nearEnd) {
      nearEndSeenAt = null;
      return;
    }

    nearEndSeenAt ??= Date.now();

    const stoppedAtEnd =
      video.ended ||
      (video.paused && Date.now() - nearEndSeenAt >= 1200);

    if (stoppedAtEnd) {
      sendLectureFinished(video, video.ended ? "poll-ended" : "poll-near-end-paused");
    }
  }

  refreshAutoPlayState();
  setInterval(refreshAutoPlayState, 1000);

  setInterval(() => {
    handleAutoplay().catch(console.error);
    attachFinishWatcher();
  }, CHECK_MS);
})();
