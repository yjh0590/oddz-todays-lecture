(() => {
  if (window.__oddzUniPlayerMainBridgeInstalled) return;
  window.__oddzUniPlayerMainBridgeInstalled = true;

  const REQUEST = "ODDZ_UNIPLAYER_PLAY_REQUEST";
  const RESULT = "ODDZ_UNIPLAYER_PLAY_RESULT";

  document.addEventListener(REQUEST, () => {
    let ok = false;
    let error = null;

    try {
      const target = window.uniPlayer?._uniPlayerEventTarget;

      if (target && typeof target.fire === "function") {
        // 실제 재생 버튼의 jQuery handler가 발생시키는 것과 동일한
        // UniPlayer 내부 이벤트.
        target.fire("vc-front-screen-play-selected");
        ok = true;

        console.log(
          "[오늘의 강의] UniPlayer 내부 PLAY_SELECTED 이벤트 실행"
        );
      } else {
        error = "uniPlayer event target not ready";
      }
    } catch (e) {
      error = String(e?.message || e);
    }

    document.dispatchEvent(
      new CustomEvent(RESULT, {
        detail: { ok, error }
      })
    );
  });
})();
