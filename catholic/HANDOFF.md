# Codex 인수인계 — 가톨릭대 LMS 자동재생 도우미

## 현재 기준
- 최신 버전: **v0.6.9**
- Chrome Manifest V3 확장프로그램
- 목적: 선택한 강의를 실제로 순서대로 재생하고, 종료 후 다음 강의로 자동 이동/자동재생
- 원칙: 출결·진도 API, watched-time, TargetUrl, `pr`, `endat` 등을 직접 조작하지 않고 실제 영상 재생을 유지

## 최신 소스
이 `catholic/` 폴더가 최신 소스다. 설치할 때도 이 폴더를 선택한다.

주요 파일:
- `manifest.json`
- `ui-content.js`
- `canvas-content.js`
- `cms-content.js`
- `background.js`
- `beforeunload-hook.js`
- `popup.html`, `popup.js`
- `README.md`
- `uniplayer-main.js` (현재 manifest에서는 로드하지 않음, 이전 MAIN-world bridge 실험 흔적)

## LMS 구조
- Canvas: `https://canvas.catholic.ac.kr`
- 과목 강의/출결: `/courses/<courseId>/external_tools/20`
- Canvas 바깥 페이지의 `iframe[name="tool_content"]` 안에 LearningX
- LearningX 내부에 CMS iframe
- CMS: `https://cms.catholic.ac.kr/em/<content_id>?...`
- 플레이어: UniPlayer
- 영상 CDN: `https://catholic.commonscdn.com/.../ssmovie.mp4`

## 강의 목록 구조
```css
.xnlal-attendance-list-item
.xnlal-attendance-list-item-meta_data-title
```
강의는 링크가 아니라 DIV 클릭 이벤트로 열림. 실제 콘솔에서 `lectures[1].click()`로 두 번째 강의 진입 성공 확인.

과목 정보는 LearningX의 `#root.dataset.course_id`, `#root.dataset.course_name` 사용.
확인된 과목 ID 예: 716, 729, 721, 725, 718.

## 저장 구조
`chrome.storage.local` 주요 키:
```text
catholicQueue
catholicQueuePos
catholicCurrentIndex
catholicPendingOpen
catholicAutoPlay
catholicCourseCatalog
catholicDebugState
```

큐 항목:
```javascript
{ key, courseId, courseName, courseUrl, lectureIndex, title }
```

## UI
Canvas 페이지 위에 인페이지 패널 주입.
구성:
1. 과목 선택
2. 영상 선택
3. 오늘 재생할 목록
4. 전체 시작 / 중지

기능:
- 여러 과목·강의 큐 구성
- 접기 / `▶`로 다시 펼치기
- 새로고침 시 전체 패널로 시작
- 영상 선택 새로고침
- 내부 스크롤
- v0.6.8부터 지속 진단 상태 표시

## 자동재생 핵심 문제와 해결
초기에는 첫 강의는 재생되지만 다음 강의는 자동재생이 안 됨.

CMS 초기에는 본편보다 먼저:
```text
preloader.mp4
약 1.066초
```
가 존재.

실제 재생 버튼:
```html
<div class="vc-front-screen-play-btn" title="재생"></div>
```

실제 handler는 UniPlayer 내부 이벤트 호출:
```javascript
uniPlayer._uniPlayerEventTarget.fire("vc-front-screen-play-selected")
```
콘솔에서 직접 실행하면 정상 재생 성공.

하지만 확장프로그램 자동 실행 시:
```text
NotAllowedError: play() failed because the user didn't interact with the document first.
```
발생. 즉 UniPlayer 명령이 틀린 것이 아니라 Chrome autoplay/user-activation 정책 문제.

### v0.6.6 해결
`chrome.debugger` 권한 + Chrome DevTools Protocol 사용.
CMS default execution context를 찾아:
```javascript
Runtime.evaluate({
  expression,
  contextId,
  returnByValue: true,
  awaitPromise: true,
  userGesture: true
})
```
로 아래를 실행:
```javascript
uniPlayer._uniPlayerEventTarget.fire("vc-front-screen-play-selected")
```
이 방식으로 첫 강의와 다음 강의를 동일하게 자동재생 성공.

주의: Chrome 상단에 디버깅 안내가 뜰 수 있으며 현재는 감수하기로 결정.

## 종료 감지
본편 판단:
- `preloader.mp4` 제외
- duration >= 60초
- src 존재
- readyState >= 1

v0.6.7에서 `ended` 순간의 `currentTime`만 보지 않고 재생 중 관찰한 `maxObservedTime`을 기준으로 실제 끝까지 재생됐는지 확인.
`ended` 이벤트가 누락되거나 UniPlayer가 상태를 바꿔도 끝부분에서 paused/ended 보조 감지.

CMS → background 메시지:
```text
LECTURE_FINISHED
```
background → Canvas:
```text
ADVANCE_TO_NEXT_LECTURE
```

## 다음 강의 이동 이슈
v0.6.8 진단에서 멈춘 실제 상태:
```text
단계        목록으로 이동 클릭
현재 항목   1. 06_CUK MakerSpace_레이저커팅기
다음 항목   2. 07_CUK MakerSpace_열전사프린터_최종
마지막 결과 목록 버튼 발견
```

즉 종료 감지/메시지 전달/advance 시작은 성공했지만, 종료 직후 LearningX/React의 `목록으로 이동` DOM은 발견되어도 `.click()`이 실제 전환으로 이어지지 않는 비결정적 타이밍 문제가 있었음.

## v0.6.9 변경
같은 과목의 다음 강의에서도 더 이상 `목록으로 이동` 버튼에 의존하지 않음.

새 흐름:
```text
영상 종료
→ next queue item을 catholicPendingOpen에 저장
→ 현재 강의/출결 페이지 location.reload()
→ 새 문서에서 resumePendingIfNeeded()
→ 강의 목록이 완전히 준비될 때까지 대기
→ pending lectureIndex 클릭
→ catholicQueuePos 갱신
→ CMS 진입
→ CDP userGesture=true 자동재생
```

즉 React 타이밍 문제를 페이지 재로딩으로 우회.

## 현재 최종 흐름
```text
전체 시작
→ queue[0] 진입
→ CMS 로드
→ player 준비
→ CDP Runtime.evaluate(userGesture=true)
→ UniPlayer PLAY_SELECTED
→ preloader/opener
→ 본편 재생
→ 본편 종료 감지
→ LECTURE_FINISHED
→ background
→ ADVANCE_TO_NEXT_LECTURE
→ next queue item 결정
→ 같은 과목이면 pending 저장 + reload
→ 다른 과목이면 해당 external_tools/20로 이동
→ 목록 로딩 대기
→ target lecture click()
→ CMS 로드
→ 다시 CDP 자동재생
→ 반복
```

## 진단 상태
v0.6.8부터 `catholicDebugState`를 `chrome.storage.local`에 저장해 CMS iframe이 사라져도 Canvas 패널에 마지막 상태가 남음.

주요 단계:
```text
영상 재생 요청
영상 재생 명령 성공
본편 재생 감시 중
본편 종료 감지 완료
다음 강의 요청 전송
background 종료 신호 수신
Canvas 이동 명령 전달 완료
다음 강의 이동 시작
같은 과목 목록 재로딩
재로딩 후 목록 대기
재로딩 후 목록 준비 완료
강의 항목 클릭
다음 강의 진입 완료
```

## 무시 가능한 콘솔 경고
현재 핵심 버그와 무관한 LMS/브라우저 경고:
```text
custom.css 404
chapter.xml 404
media_script_list.xml 404
caption_list.xml 404
react-i18next old wait option
Permissions policy violation: unload is not allowed
```

특히 `beforeunload-hook.js` 줄로 표시되는 unload 경고는 wrapper 때문에 line attribution이 그렇게 보일 수 있음.

## beforeunload-hook.js
목적: 자동 이동 시 LMS의 beforeunload 경고 제거.
- `window.addEventListener` wrapping
- `beforeunload` listener만 추적
- `ODDZ_SUPPRESS_BEFOREUNLOAD` 수신 시 제거
- `window.onbeforeunload = null`

EventTarget.prototype 전체 monkeypatch는 과거에 제거함.
현재 핵심 자동재생 문제와 직접 관계 없음.

## 버전 히스토리
- **v0.4.5**: 중앙 재생 버튼 click, 첫 자동재생은 됐으나 auto-next 미완
- **v0.4.6+**: 다음 강의 진입 후 재생 실패
- **v0.5.6**: same-course 다음 이동 개선, `ensureLectureList()` 도입. 수동 재생 종료 후 다음 강의 이동 성공 확인
- **v0.5.8**: UI 전체 패널/새로고침 상태 개선
- **v0.5.9**: beforeunload monkeypatch 범위 축소
- **v0.6.0~0.6.4**: preloader/main video 구분, 중앙 버튼 click, 안정화 대기 등 실험
- **v0.6.5**: UniPlayer 내부 `vc-front-screen-play-selected` 직접 호출, extension에서는 NotAllowedError
- **v0.6.6**: `chrome.debugger` + CDP `Runtime.evaluate(userGesture=true)`로 자동재생 해결
- **v0.6.7**: `maxObservedTime` 기반 종료 감지 안정화
- **v0.6.8**: UI에 지속 진단 상태 표시
- **v0.6.9**: same-course 이동을 pending + reload 방식으로 변경

## Codex가 우선 확인할 것
1. v0.6.9 실제 연속 재생 테스트
   - 같은 과목 2~3강 연속
   - 서로 다른 과목 간 이동
2. same-course 이동 상태가 아래 순서로 이어지는지:
   ```text
   같은 과목 목록 재로딩
   → 재로딩 후 목록 대기
   → 재로딩 후 목록 준비 완료
   → 강의 항목 클릭
   → 다음 강의 진입 완료
   ```
3. `catholicQueuePos`가 실제 강의 click 성공 뒤 갱신되는지
4. `catholicPendingOpen`이 reload 후 정상 소비되고 실패 시 무한 잔존하지 않는지
5. cross-course 이동에서 새 과목 `resumePendingIfNeeded()`가 정상 실행되는지
6. debugger/CDP CMS execution context 탐색 안정성

## 정상 작동 확인된 핵심 자동재생 경로 — 가능하면 건드리지 말 것
```text
chrome.debugger
→ Runtime.evaluate(userGesture=true)
→ CMS main/default execution context
→ uniPlayer._uniPlayerEventTarget.fire("vc-front-screen-play-selected")
```

또한 출결 API 직접 호출, watched-time 조작, TargetUrl progress endpoint 직접 호출, `endat`/`pr` 조작은 하지 말 것. 실제 영상을 재생하는 현재 구조를 유지.

## 테스트 체크리스트
1. `chrome://extensions` → 개발자 모드 ON
2. `catholic/` 폴더 로드
3. LMS 탭 새로고침
4. 과목/영상 목록 표시 확인
5. 큐 구성
6. 전체 시작
7. 첫 강의 자동재생 확인
8. 종료 시 진단 상태 확인
9. same-course 다음 강의 reload → click → 자동재생 확인
10. cross-course 이동 확인

실패 시 패널의 `단계 / 현재 항목 / 다음 항목 / 마지막 결과`를 먼저 확인하고 해당 구간만 최소 수정할 것.
