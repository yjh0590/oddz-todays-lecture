const courseSelect = document.getElementById("courseSelect");
const openCourseButton = document.getElementById("openCourse");
const lectureCountEl = document.getElementById("lectureCount");
const queueCountEl = document.getElementById("queueCount");
const lectureListEl = document.getElementById("lectureList");
const queueListEl = document.getElementById("queueList");
const addSelectedButton = document.getElementById("addSelected");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const statusEl = document.getElementById("status");

let currentContext = null;
let courseCatalog = [];

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(text, playing = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("playing", playing);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadCourses() {
  try {
    const tab = await getActiveTab();

    let response = null;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "GET_CATHOLIC_DASHBOARD_COURSES"
      });
    } catch {}

    if (response?.courses?.length) {
      courseCatalog = response.courses;
    } else {
      const state = await chrome.storage.local.get(["catholicCourseCatalog"]);
      courseCatalog = Array.isArray(state.catholicCourseCatalog)
        ? state.catholicCourseCatalog
        : [];
    }

    courseSelect.innerHTML = "";

    if (!courseCatalog.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "대시보드에서 확장프로그램을 한 번 열어주세요";
      courseSelect.appendChild(option);
      setStatus("과목 목록을 가져오려면 Canvas 대시보드에서 한 번 열어주세요.");
      return;
    }

    for (const course of courseCatalog) {
      const option = document.createElement("option");
      option.value = course.courseId;
      option.textContent = course.courseName;
      courseSelect.appendChild(option);
    }
  } catch (error) {
    courseSelect.innerHTML = `<option value="">과목 목록을 불러오지 못했습니다</option>`;
  }
}

async function loadCurrentCourse() {
  try {
    const tab = await getActiveTab();
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_CATHOLIC_COURSE_CONTEXT"
    });

    if (!response?.ok) throw new Error("no lecture context");

    currentContext = response;

    if (courseSelect.querySelector(`option[value="${response.courseId}"]`)) {
      courseSelect.value = String(response.courseId);
    }

    renderLectures();
    setStatus(`${response.courseName} · 강의를 선택하세요.`);
  } catch {
    currentContext = null;
    lectureCountEl.textContent = "0개";
    lectureListEl.innerHTML = `
      <div class="empty">
        위에서 과목을 고른 뒤<br>
        ‘강의/출결 열기’를 눌러주세요.
      </div>`;
  }
}

function renderLectures() {
  const lectures = currentContext?.lectures || [];
  lectureCountEl.textContent = `${lectures.length}개`;

  if (!lectures.length) {
    lectureListEl.innerHTML = `<div class="empty">영상 목록을 찾지 못했습니다.</div>`;
    return;
  }

  lectureListEl.innerHTML = lectures.map(lecture => `
    <label class="lecture-row">
      <input type="checkbox" data-lecture-index="${lecture.index}">
      <div>
        <div class="lecture-title">${escapeHtml(lecture.title)}</div>
        <div class="lecture-meta">${lecture.index + 1}차시</div>
      </div>
    </label>
  `).join("");
}

async function loadQueue() {
  const state = await chrome.storage.local.get([
    "catholicQueue",
    "catholicAutoPlay",
    "catholicQueuePos"
  ]);

  const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];
  const pos = Number(state.catholicQueuePos);

  queueCountEl.textContent = `${queue.length}개`;

  if (!queue.length) {
    queueListEl.innerHTML = `
      <div class="empty">
        선택한 강의를 여기에 모을 수 있습니다.<br>
        과목이 달라도 함께 담을 수 있습니다.
      </div>`;
  } else {
    queueListEl.innerHTML = queue.map((item, index) => {
      const active = state.catholicAutoPlay && index === pos;
      return `
        <div class="queue-row">
          <div class="queue-num">${index + 1}</div>
          <div>
            <div class="queue-title">${escapeHtml(item.title)}</div>
            <div class="queue-course">${escapeHtml(item.courseName)}${active ? " · 재생 중" : ""}</div>
          </div>
          <button class="remove" data-remove="${index}" title="목록에서 제거">✕</button>
        </div>`;
    }).join("");
  }

  queueListEl.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", async () => {
      const state2 = await chrome.storage.local.get(["catholicQueue", "catholicAutoPlay"]);
      if (state2.catholicAutoPlay) {
        setStatus("재생 중에는 목록을 수정할 수 없습니다.");
        return;
      }

      const q = Array.isArray(state2.catholicQueue) ? state2.catholicQueue : [];
      q.splice(Number(button.dataset.remove), 1);
      await chrome.storage.local.set({ catholicQueue: q });
      await loadQueue();
    });
  });

  if (state.catholicAutoPlay && Number.isInteger(pos) && queue[pos]) {
    setStatus(`재생 중 · ${queue[pos].courseName} · ${queue[pos].title}`, true);
  }
}

openCourseButton.addEventListener("click", async () => {
  const courseId = courseSelect.value;

  if (!courseId) {
    setStatus("먼저 과목을 선택해주세요.");
    return;
  }

  try {
    const tab = await getActiveTab();
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "OPEN_CATHOLIC_COURSE",
      courseId
    });

    if (!response?.ok) throw new Error(response?.error || "이동 실패");

    setStatus("선택한 과목의 강의/출결로 이동합니다. 이동 후 확장프로그램을 다시 열어주세요.");
  } catch (error) {
    setStatus(`과목 열기 실패 · ${String(error)}`);
  }
});

addSelectedButton.addEventListener("click", async () => {
  if (!currentContext) {
    setStatus("먼저 선택한 과목의 강의/출결 화면을 열어주세요.");
    return;
  }

  const checked = [...lectureListEl.querySelectorAll(
    'input[type="checkbox"]:checked'
  )];

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
    const lectureIndex = Number(input.dataset.lectureIndex);
    const lecture = currentContext.lectures.find(x => x.index === lectureIndex);
    if (!lecture) continue;

    const key = `${currentContext.courseId}:${lectureIndex}`;

    if (!queue.some(item => item.key === key)) {
      queue.push({
        key,
        courseId: String(currentContext.courseId),
        courseName: currentContext.courseName,
        courseUrl: currentContext.courseUrl,
        lectureIndex,
        title: lecture.title
      });
    }

    input.checked = false;
  }

  await chrome.storage.local.set({ catholicQueue: queue });
  await loadQueue();
  setStatus("오늘 재생할 목록에 추가했습니다.");
});

startButton.addEventListener("click", async () => {
  try {
    const state = await chrome.storage.local.get(["catholicQueue"]);
    const queue = Array.isArray(state.catholicQueue) ? state.catholicQueue : [];

    if (!queue.length) {
      setStatus("오늘 재생할 목록이 비어 있습니다.");
      return;
    }

    const tab = await getActiveTab();
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "START_CATHOLIC_QUEUE"
    });

    if (!response?.ok) throw new Error(response?.error || "재생 시작 실패");

    setStatus("오늘의 강의 재생을 시작했습니다.", true);
    setTimeout(loadQueue, 400);
  } catch (error) {
    setStatus(`시작 실패 · ${String(error)}`);
  }
});

stopButton.addEventListener("click", async () => {
  try {
    const tab = await getActiveTab();
    await chrome.tabs.sendMessage(tab.id, {
      type: "STOP_CATHOLIC_AUTOPLAY"
    });
  } catch {}

  await chrome.storage.local.set({
    catholicAutoPlay: false,
    catholicPendingOpen: null,
    catholicQueuePos: null
  });

  setStatus("자동 재생을 중지했습니다.");
  await loadQueue();
});

(async () => {
  await loadCourses();
  await Promise.all([loadCurrentCourse(), loadQueue()]);
})();
