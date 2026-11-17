(() => {
  if(window.__oddzLmsQueueV2)return;
  window.__oddzLmsQueueV2=true;
  let state=null,tabId=null,video=null,binding=null,endTimer=null,homeTimer=null,ready=false;
  let scanKey='',choices=[],localNote='',shownDone=null;
  const host=document.createElement('div');
  host.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647';
  const ui=host.attachShadow({mode:'open'});
  ui.innerHTML=`<style>
  :host{font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#20304a;color-scheme:light}
  *{box-sizing:border-box} [hidden]{display:none!important}
  section{width:min(1040px,calc(100vw - 48px));height:min(740px,calc(100dvh - 48px));display:flex;flex-direction:column;background:#f6f8fc;border:1px solid #dce3ef;border-radius:22px;box-shadow:0 18px 70px #15233b33;overflow:hidden}
  header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 22px;background:#fff;border-bottom:1px solid #e3e9f2;flex-shrink:0}
  header b{font-size:21px;letter-spacing:-.5px}#total{margin-left:8px;font-size:13px;font-weight:600;color:#245eaf;white-space:nowrap;font-variant-numeric:tabular-nums}.eyebrow{display:block;font-size:11px;font-weight:700;letter-spacing:1.8px;color:#6c7e98;margin-bottom:2px}
  #body{padding:18px 22px;display:flex;flex-direction:column;gap:14px;flex:1;overflow:hidden;min-height:0}
  p{margin:6px 0}h3{margin:0;font-size:17px;line-height:1.5;overflow-wrap:anywhere;word-break:keep-all}
  button,a.link{font:inherit;line-height:1.4;cursor:pointer;padding:10px 14px;border:1px solid #dce4f0;border-radius:10px;background:#fff;color:#314663;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;white-space:normal;word-break:keep-all;overflow-wrap:anywhere;transition:background .15s}
  button:hover,a.link:hover{background:#f0f4fb}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #8bb6ff;outline-offset:2px}
  button.primary{background:#2863cf;border-color:#2863cf;color:#fff;font-weight:700}button.primary:hover{background:#1e51b1}
  button:disabled{opacity:.4;cursor:default}#stop{color:#a23b43}#fold{flex-shrink:0;font-size:13px;padding:8px 13px}
  .status{flex-shrink:0;font-size:13px;line-height:1.6;color:#42628b;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;word-break:keep-all;overflow-wrap:anywhere}
  #progress{min-width:0;font-size:13px;color:#587091;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#progress:empty{display:none}
  .toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0}.run-actions{display:flex;flex-shrink:0;gap:8px}.run-actions button{font-size:13px;padding:9px 13px}
  .columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:16px;flex:1;min-height:0}
  .card{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;background:#fff;border:1px solid #e0e7f1;border-radius:16px;padding:16px}
  .card-heading{display:flex;flex-shrink:0;gap:10px;align-items:flex-start;margin-bottom:12px}.step{flex-shrink:0;display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#edf3ff;color:#2863cf;font-size:13px;font-weight:700}
  .subtext{display:block;font-size:12px;color:#7a899f;margin-top:3px;word-break:keep-all}
  .card-actions{display:flex;flex-shrink:0;gap:8px;flex-wrap:wrap;margin-top:12px}.card-actions button,.card-actions a{font-size:13px}#refresh{width:100%;flex-shrink:0;font-size:13px;padding:8px 12px;margin-bottom:10px}
  #queue,#discover{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:3px}
  .entry{padding:14px 12px;margin-bottom:9px;border:1px solid #e5eaf2;border-radius:11px;background:#fbfcfe}
  .entry small{display:block;font-size:12px;color:#6b7e98;margin-bottom:5px;word-break:keep-all;overflow-wrap:anywhere}
  .entry-title{font-weight:600;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}
  .entry.done{background:#f5f7fa;color:#7b889a}.entry.now{background:#edf4ff;border-color:#9cbcf0}
  .tools{display:flex;gap:6px;margin-top:10px}.tools button{font-size:12px;padding:5px 10px}.tools button:last-child{margin-left:auto}
  label{display:flex;gap:10px;padding:12px;margin-bottom:8px;align-items:flex-start;border:1px solid #e5eaf2;border-radius:10px;cursor:pointer}
  label:hover{background:#f7faff}label:has(input:checked){background:#edf4ff;border-color:#9cbcf0}
  label .lecture-info{flex:1;min-width:0;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}input{flex-shrink:0;width:17px;height:17px;margin:4px 0 0;accent-color:#2863cf}
  #discover a.link{display:flex;width:100%;justify-content:flex-start;text-align:left;padding:12px 14px;margin-bottom:8px;line-height:1.65}#discover br{display:none}
  .lecture-title{display:block;font-size:16px;font-weight:700;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}
  .lecture-period{display:flex;flex-wrap:wrap;gap:0 5px;font-size:12px;font-weight:600;line-height:1.8;color:#245eaf;margin-top:7px;font-variant-numeric:tabular-nums}
  .lecture-period time{white-space:nowrap}.lecture-period.closed{color:#98601c}
  .lecture-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:12px}
  .badge{display:inline-block;padding:3px 8px;border-radius:6px;font-weight:600;background:#eef2f7;color:#65748b}
  .badge.available{background:#eaf2ff;color:#245eaf}.badge.complete{background:#e7f5ef;color:#287452}.badge.closed{background:#fff1dc;color:#98601c}.badge.incomplete{background:#f0f2f7;color:#65748b}
  .lecture-length{color:#637690;font-variant-numeric:tabular-nums}.lecture-extra{display:block;font-size:12px;color:#65748b;margin-top:5px}
  #add{width:100%}small{color:#65748b}.help{font-size:12px;line-height:1.8;color:#7b899c;margin-top:12px;word-break:keep-all;overflow-wrap:anywhere}
  .footer-note{flex-shrink:0;font-size:11px;line-height:1.5;color:#7b899c;margin:0;word-break:keep-all;overflow-wrap:anywhere}
  #compact-status{padding:12px 16px;font-size:12px;line-height:1.6;color:#687d99;word-break:keep-all;overflow-wrap:anywhere}
  section.folded{width:min(300px,calc(100vw - 32px));height:auto;border-radius:16px}section.folded header{padding:13px 16px;gap:10px}section.folded header b{font-size:15px}section.folded .eyebrow{display:none}
  dialog{border:1px solid #dce3ef;border-radius:20px;padding:28px;max-width:min(460px,calc(100vw - 32px));color:#20304a;box-shadow:0 18px 70px #15233b33;line-height:1.7}dialog h2{font-size:21px;margin:0 0 12px}dialog button{margin-top:18px}dialog::backdrop{background:#15233b66}
  @media(max-width:700px){section{width:calc(100vw - 24px);height:calc(100dvh - 32px);border-radius:16px}header{padding:12px 16px}header b{font-size:18px}#body{padding:12px;gap:10px}.toolbar{flex-wrap:wrap;gap:6px}.columns{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:10px}.card{padding:10px}.card-heading{margin-bottom:7px}.card-heading h3{font-size:14px}.subtext,.footer-note{display:none}.step{width:23px;height:23px;font-size:11px}.card-actions{margin-top:7px}.card-actions button,.card-actions a,#refresh{padding:6px 10px;font-size:12px}#refresh{margin-bottom:7px}.eyebrow{display:none}}
  @media(max-height:540px){header{padding-top:10px;padding-bottom:10px}.eyebrow,.subtext,.footer-note{display:none}#body{padding:10px 14px;gap:8px}.card{padding:10px}.card-heading{margin-bottom:6px}.card-heading h3{font-size:14px}.card-actions{margin-top:6px}.card-actions button,.card-actions a,#refresh{padding:5px 9px}#refresh{margin-bottom:6px}.run-actions button{padding:6px 10px}.status{-webkit-line-clamp:1}}
  @media(prefers-reduced-motion:reduce){button,a.link{transition:none}}
  </style>
  <section id="panel"><header><div><span class="eyebrow">ODDZ · K-MOOC</span><b>오늘의 강의</b><span id="total" hidden></span></div><button id="fold" aria-expanded="true" aria-controls="body">접기</button></header>
  <div id="compact-status" hidden></div>
  <div id="body"><div class="toolbar"><div class="run-actions"><button class="primary" id="start">전체 시작</button><button id="stop">중지</button><button id="reset">실행 초기화</button></div><div id="progress"></div></div>
  <div class="status" id="status" role="status" hidden></div>
  <div class="columns">
  <div class="card"><div class="card-heading"><span class="step">1</span><div><h3 id="discover-title">과목 / 영상 선택</h3><span class="subtext">과목을 열고 오늘 들을 영상을 선택하세요.</span></div></div>
  <button id="refresh">현재 페이지 다시 읽기</button><div id="discover"></div><div class="card-actions"><button class="primary" id="add">선택 영상 추가</button></div></div>
  <div class="card"><div class="card-heading"><span class="step">2</span><div><h3>오늘 재생할 목록</h3><span class="subtext">순서를 확인한 뒤 전체 시작을 누르세요.</span></div></div>
  <div id="queue"></div><div class="card-actions"><a class="link" href="https://lms.kmooc.kr/">홈페이지</a><button id="clear">목록 비우기</button></div></div>
  </div><p class="footer-note">제목·수강 기간을 확인하고 선택하세요. 출석·진도 인정 여부는 LMS에서 확인해주세요.</p></div></section>
  <dialog id="finished"><h2>오늘의 영상 재생 완료</h2><p id="finished-text"></p><p><small>출석·진도 인정 여부는 LMS에서 확인해주세요.</small></p><button class="primary" id="close-finished">확인</button></dialog>`;
  document.documentElement.append(host);
  const $=id=>ui.querySelector('#'+id);
  const isBusy=()=>state&&['running','finishing'].includes(state.status);
  const isOwner=()=>state&&state.owner===tabId;
  const editable=()=>!state||['idle','done'].includes(state.status);
  const currentId=()=>new URL(location.href).searchParams.get('id');
  const isViewer=()=>/^\/mod\/vod\/(view|viewer)\.php$/.test(location.pathname);
  const isHome=()=>['/','/index.php'].includes(location.pathname);
  const expected=()=>state?.items[state.index];
  function note(text){localNote=text;renderStatus();}
  function renderStatus(){
    const statusText=localNote||(['running','finishing','paused'].includes(state?.status)?state.note:'')||'';
    $('status').textContent=statusText;$('status').title=statusText;$('status').hidden=!statusText;
    $('compact-status').textContent=state?.items.length ? `선택 ${state.items.length}개 · 완료 ${Math.min(state.index,state.items.length)}개 · ${isBusy()?'재생 중':state.status==='paused'?'중지됨':state.status==='done'?'완료':'대기 중'}` : '펼쳐서 오늘 들을 영상을 선택하세요.';
    $('progress').textContent=state?.items.length ? `전체 ${state.items.length}개 · 완료 ${Math.min(state.index,state.items.length)}개${isBusy()&&expected()?' · 현재: '+expected().course:''}` : '';
    $('progress').title=$('progress').textContent;
    const {text,missing}=totalLength(state?.items||[]);
    $('total').textContent=text?`총 ${text}${missing?' +α':''}`:'';$('total').hidden=!text;
    $('total').title=missing?`재생 시간을 읽지 못한 영상 ${missing}개는 빠져 있습니다.`:'';
  }
  // 'm:ss' 또는 'h:mm:ss' 영상 길이를 모두 더해 'n시간 m분'으로 표시한다.
  function totalLength(items){
    let sec=0,missing=0;
    for(const item of items){
      const len=lectureDetails(item.title).length;
      if(!len){missing++;continue;}
      sec+=len.split(':').reduce((acc,part)=>acc*60+Number(part),0);
    }
    if(!sec)return {text:'',missing};
    const min=Math.ceil(sec/60),h=Math.floor(min/60),m=min%60;
    return {text:h?`${h}시간${m?' '+m+'분':''}`:`${m}분`,missing};
  }
  function accept(s){
    state=s;if(!isBusy())localNote='';render();
    if(state.status==='done'&&isOwner()&&isHome()&&shownDone!==state.completedAt){
      shownDone=state.completedAt;$('finished-text').textContent=`선택한 영상 ${state.items.length}개를 모두 재생했습니다.`;
      if(!$('finished').open)$('finished').showModal();
    }
    if(!isBusy())cancelTimers();
    if(ready&&isBusy()&&isOwner()&&state.phase==='home'&&isHome()&&!homeTimer){
      const token={runId:state.runId,index:state.index};
      homeTimer=setTimeout(()=>{homeTimer=null;if(isBusy()&&isOwner()&&state.phase==='home'&&state.runId===token.runId&&state.index===token.index)send('HOME_CONTINUE',token);},2000);
    }
  }
  async function send(type,data={}){
    try{
      const r=await chrome.runtime.sendMessage({type,...data});
      if(!r.ok){note(r.error);return null;}
      tabId=r.tabId;accept(r.state);return r.state;
    }catch{note('확장프로그램 연결이 끊겼습니다. 강의 창을 새로고침해주세요.');return null;}
  }
  function cancelTimers(){if(endTimer)clearTimeout(endTimer);endTimer=null;if(homeTimer)clearTimeout(homeTimer);homeTimer=null;}
  function render(){
    renderStatus();$('start').textContent=state?.status==='paused'?'이어서 시작':'전체 시작';
    $('start').disabled=isBusy()||!state?.items.length;$('stop').disabled=!isBusy();
    $('clear').disabled=!editable();$('add').disabled=!editable();
    const container=$('queue');container.replaceChildren();
    if(!state?.items.length){const p=document.createElement('p');p.textContent='아직 선택한 영상이 없습니다.';container.append(p);}
    state?.items.forEach((item,i)=>{
      const row=document.createElement('div');row.className='entry'+(i<state.index?' done':'')+(isBusy()&&i===state.index?' now':'');
      const course=document.createElement('small');course.textContent=`${i+1}. ${item.course}${i<state.index?' · 재생 완료':''}`;
      const title=document.createElement('div');title.className='entry-title';appendLecture(title,item.title);
      const tools=document.createElement('div');tools.className='tools';
      for(const [label,type,data] of [['↑','MOVE',{id:item.id,direction:-1}],['↓','MOVE',{id:item.id,direction:1}],['삭제','REMOVE',{id:item.id}]]){
        const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label',type==='MOVE'?(data.direction<0?'위로 이동':'아래로 이동')+' · '+item.title:'삭제 · '+item.title);button.disabled=!editable();button.onclick=()=>send(type,data);tools.append(button);
      }
      row.append(course,title,tools);container.append(row);
    });
  }
  const normalize=text=>(text||'').replace(/\s+/g,' ').trim();
  let savedCourses={};
  try{savedCourses=JSON.parse(sessionStorage.getItem('oddzLmsCourseLabels')||'{}');}catch{}
  // K-MOOC 강좌 카드 링크는 '미생물학 입문2026-09-01 09:00:00 ~ ...' 형식이다.
  // 날짜가 붙은 링크만 강좌로 보고, '학습하기'·'강의실 홈' 같은 메뉴 링크는 버린다.
  function parseCourse(raw){
    const text=normalize(raw),date=text.search(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/);
    if(date<1)return null;
    const name=text.slice(0,date).trim();
    return name?{name,code:'',teacher:''}:null;
  }
  function courseLabel(info){return info.name;}
  function lectureDetails(raw){
    let text=normalize(raw);
    const dates=[...text.matchAll(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g)];
    let title=dates.length?text.slice(0,dates[0].index).trim():text;
    let tail=dates.length?text.slice(dates[dates.length-1].index+dates[dates.length-1][0].length).trim():'';
    title=title.replace(/^활동\s+활동\s+/,'활동 ');
    // '선택' is an accessible control label followed by the repeated title.
    const split=title.split(/\s+선택\s+/);
    if(split.length===2){
      const left=split[0].trim(),right=split[1].trim();
      title=left.replace(/^활동\s+/,'')===right.replace(/^활동\s+/,'')?left:left+' '+right;
    }
    title=title.replace(/\s+선택$/,'').trim();
    const availability=tail.match(/참여\s*가능|시작\s*전|마감/)?.[0].replace(/\s+/g,' ')||'';
    const completion=tail.match(/미완료|완료|진행\s*중/)?.[0].replace(/\s+/g,' ')||'';
    const length=tail.match(/(?:^|\s)(\d{1,3}:\d{2}(?::\d{2})?)(?=\s|$)/)?.[1]||'';
    let extra=tail;
    for(const part of [availability,completion,length])if(part)extra=extra.replace(part,'');
    extra=extra.replace(/[|·~]/g,' ').trim();
    return {title:title||text,dates:dates.map(x=>x[0]),availability,completion,length,extra};
  }
  function appendLecture(container,raw){
    const data=lectureDetails(raw);
    const title=document.createElement('span');title.className='lecture-title';title.textContent=data.title;container.append(title);
    if(data.dates.length){
      const period=document.createElement('span');period.className='lecture-period'+(data.availability==='마감'?' closed':'');
      data.dates.forEach((date,i)=>{if(i)period.append(document.createTextNode(' ~ '));const t=document.createElement('time');t.textContent=date;t.dateTime=date.replace(' ','T');period.append(t);});
      container.append(period);
    }
    const meta=document.createElement('span');meta.className='lecture-meta';
    for(const [value,kind] of [[data.availability,data.availability==='참여 가능'?'available':data.availability==='마감'?'closed':'incomplete'],[data.length,'length'],[data.completion,data.completion==='완료'?'complete':'incomplete']]){
      if(!value)continue;const badge=document.createElement('span');badge.className=kind==='length'?'lecture-length':'badge '+kind;badge.textContent=value;meta.append(badge);
    }
    if(meta.childNodes.length)container.append(meta);
    if(data.extra){const extra=document.createElement('span');extra.className='lecture-extra';extra.textContent=data.extra;container.append(extra);}
  }
  function anchors(){
    return [...document.querySelectorAll('a[href]')].flatMap(a=>{
      try{const u=new URL(a.href,location.href);return u.origin===location.origin?[{a,u,text:a.textContent.trim().replace(/\s+/g,' ')}]:[];}catch{return [];}
    });
  }
  function scan(force=false){
    const all=anchors(), courseId=location.pathname==='/course/view.php'?currentId():null;
    const courses=new Map();
    for(const x of all){
      if(x.u.pathname!=='/course/view.php'||x.u.searchParams.get('mode'))continue;
      const id=x.u.searchParams.get('id'),info=parseCourse(x.text);
      if(!/^\d+$/.test(id||'')||!info)continue;
      const existing=courses.get(id)||savedCourses[id];
      if(!existing||info.teacher.length>existing.teacher.length)courses.set(id,info);
      else courses.set(id,existing);
    }
    for(const [id,info] of courses)savedCourses[id]=info;
    try{sessionStorage.setItem('oddzLmsCourseLabels',JSON.stringify(savedCourses));}catch{}
    const heading=document.querySelector('h1')?.textContent.trim()||document.title.split('|')[0].trim();
    const course=savedCourses[courseId]?courseLabel(savedCourses[courseId]):heading||`과목 ${courseId}`;
    const videos=new Map();
    // K-MOOC 영상 항목은 href 없이 onclick="window.open('.../mod/vod/viewer.php?id=N', ...)"로 열린다.
    // 제목·기간·길이·완료 여부를 lectureDetails()가 읽는 '제목 날짜 ~ 날짜 길이 상태' 형식으로 합친다.
    if(courseId)for(const li of document.querySelectorAll('li.activity.modtype_vod')){
      const id=li.querySelector('a[onclick*="viewer.php"]')?.getAttribute('onclick').match(/viewer\.php\?id=(\d{1,12})/)?.[1];
      if(!id||videos.has(id))continue;
      const nameEl=li.querySelector('.instancename')?.cloneNode(true);nameEl?.querySelector('.accesshide')?.remove();
      const name=normalize(nameEl?.textContent);if(!name)continue;
      const time=normalize(li.querySelector('.text-time')?.textContent),length=normalize(li.querySelector('.text-playtime')?.textContent);
      const done=/completion-(auto|manual)-(y|pass)/.test(li.querySelector('.autocompletion img')?.src||'')?'완료':'미완료';
      videos.set(id,{id,courseId,course,title:[name,time,length,done].filter(Boolean).join(' ').slice(0,500)});
    }
    choices=[...videos.values()];
    const key=JSON.stringify({choices,courses:[...courses]});if(key===scanKey&&!force)return;scanKey=key;
    const selected=new Set([...ui.querySelectorAll('.video-choice:checked')].map(x=>x.value));
    const box=$('discover');box.replaceChildren();
    if(courseId){
      $('discover-title').textContent=`이 과목에서 읽은 영상 ${choices.length}개`;$('add').hidden=false;
      if(!choices.length){const p=document.createElement('p');p.textContent='영상을 찾지 못했습니다. 강의실 화면이 다 열린 뒤 다시 읽기를 눌러주세요.';box.append(p);}
      for(const item of choices){
        const label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');
        check.type='checkbox';check.value=item.id;check.className='video-choice';
        check.checked=!force&&selected.has(item.id);text.className='lecture-info';appendLecture(text,item.title);
        label.append(check,text);box.append(label);
      }
    }else{
      $('discover-title').textContent='과목을 열어 영상 선택';$('add').hidden=true;
      for(const [id,info] of courses){const a=document.createElement('a');a.className='link';a.textContent=courseLabel(info);a.href=`https://lms.kmooc.kr/course/view.php?id=${id}`;box.append(a,document.createElement('br'));}
      if(!courses.size){const p=document.createElement('p');p.textContent=isViewer()?'영상 선택은 강좌의 강의실 화면에서 할 수 있습니다.':'강좌를 찾지 못했습니다. 내 강의실에서 강좌를 직접 열어주세요.';box.append(p);}
    }
  }
  function setFolded(folded){
    $('body').hidden=folded;$('compact-status').hidden=!folded;
    $('panel').classList.toggle('folded',folded);
    $('fold').textContent=folded?'펼치기':'접기';$('fold').setAttribute('aria-expanded',String(!folded));
    host.style.cssText=folded
      ? 'position:fixed;right:16px;top:80px;z-index:2147483647;max-height:calc(100dvh - 96px);overflow:auto'
      : 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647';
    try{sessionStorage.setItem('oddzLmsPanelFolded',String(folded));}catch{}
  }
  let initiallyFolded=false;
  try{initiallyFolded=sessionStorage.getItem('oddzLmsPanelFolded')==='true';}catch{}
  setFolded(initiallyFolded);
  $('fold').onclick=()=>setFolded(!$('body').hidden);

  $('refresh').onclick=()=>scan(true);
  $('add').onclick=async()=>{
    const ids=new Set([...ui.querySelectorAll('.video-choice:checked')].map(x=>x.value));
    if(!ids.size){note('추가할 영상을 체크해주세요.');return;}
    localNote='';const result=await send('ADD',{items:choices.filter(x=>ids.has(x.id))});if(result)scan(true);
  };
  for(const [id,type] of [['start','START'],['stop','STOP'],['reset','RESET'],['clear','CLEAR']])$(id).onclick=()=>{localNote='';send(type);};
  $('close-finished').onclick=()=>$('finished').close();
  chrome.runtime.onMessage.addListener(msg=>{if(msg.type==='ODDZ_STATE')accept(msg.state);});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.oddzLmsQueueV2?.newValue)accept(changes.oddzLmsQueueV2.newValue);});
  function token(){return{runId:state.runId,index:state.index};}
  async function play(){
    if(!isBusy()||!isOwner()||state.phase!=='video'||!video||currentId()!==expected()?.id)return;
    if(video.ended){send('ERROR',{...token(),note:'영상이 이미 끝난 상태로 열렸습니다. 영상을 다시 재생한 뒤 이어서 시작해주세요.'});return;}
    try{await video.play();localNote='';renderStatus();}
    catch{note('자동 재생이 차단됐습니다. 영상의 재생 버튼을 직접 눌러주세요.');}
  }
  function bind(v){
    if(binding)for(const [event,handler]of Object.entries(binding.handlers))video.removeEventListener(event,handler);
    video=v;binding={last:v.currentTime,played:false,src:v.currentSrc,handlers:{}};
    binding.handlers={
      timeupdate:()=>{
        if(video.currentSrc!==binding.src){binding.src=video.currentSrc;binding.played=false;binding.last=video.currentTime;cancelTimers();}
        if(!video.paused&&!video.seeking&&video.currentTime>binding.last&&video.currentTime-binding.last<3)binding.played=true;
        binding.last=video.currentTime;
      },
      seeking:()=>{cancelTimers();binding.played=false;},
      play:()=>{localNote='';renderStatus();},
      ended:()=>{
        if(!ready||!isBusy()||!isOwner()||state.phase!=='video'||!video.ended||!binding.played||endTimer)return;
        const t=token();note('영상 종료 · 5초 뒤 다음 선택 영상으로 이동합니다.');
        endTimer=setTimeout(()=>{
          endTimer=null;
          if(isBusy()&&isOwner()&&video.ended&&binding.played&&state.runId===t.runId&&state.index===t.index){localNote='';send('ENDED',t);}
        },5000);
      }
    };
    for(const [event,handler]of Object.entries(binding.handlers))v.addEventListener(event,handler);
    play();
  }
  let missingSince=Date.now(),reportedMissing=false;
  async function init(){
    scan(true);await send('GET');
    await send('READY');ready=true;
    if(state)accept(state);
    setInterval(()=>{
      if(!isBusy()||!isOwner()||!isViewer())return;
      const visible=[...document.querySelectorAll('video')].filter(v=>v.getBoundingClientRect().width>0);
      if(visible.length>1&&!reportedMissing){reportedMissing=true;send('ERROR',{...token(),note:'영상이 여러 개라서 중지했습니다.'});return;}
      if(visible.length===1){missingSince=Date.now();if(video!==visible[0])bind(visible[0]);}
      else if(Date.now()-missingSince>45000&&!reportedMissing){reportedMissing=true;send('ERROR',{...token(),note:'45초 동안 영상을 찾지 못해 중지했습니다. 접근 권한과 수강 가능 기간을 확인해주세요.'});}
    },500);
    setInterval(()=>{scan();},3000);
  }
  init();
})();
