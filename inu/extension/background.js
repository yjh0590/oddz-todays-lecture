const KEY='oddzLmsQueueV2', HOME='https://lms.inu.ac.kr/';
const fresh=()=>({items:[],index:0,status:'idle',phase:'video',owner:null,runId:null,note:'영상을 선택해 오늘 목록에 추가해주세요.'});
const busy=s=>['running','finishing'].includes(s.status);
const validId=id=>typeof id==='string' && /^\d{1,12}$/.test(id);
const videoUrl=item=>`https://lms.inu.ac.kr/mod/vod/viewer.php?id=${item.id}`;
let chain=Promise.resolve();
function serial(fn){const p=chain.then(fn);chain=p.catch(()=>{});return p;}
async function read(){return (await chrome.storage.local.get(KEY))[KEY] || fresh();}
async function write(s){
  await chrome.storage.local.set({[KEY]:s});
  if(s.owner!==null) await chrome.tabs.sendMessage(s.owner,{type:'ODDZ_STATE',state:s}).catch(()=>{});
  return s;
}
async function pause(s,note){s.status='paused';s.note=note;return write(s);}
async function navigate(s,url){
  s.navigatingAt=Date.now();
  await write(s);
  try{await chrome.tabs.update(s.owner,{url});}catch{await pause(s,'실행 창에 접근할 수 없어 중지했습니다. LMS 홈페이지에서 이어서 시작해주세요.');}
  return s;
}
function requireRun(s,msg,sender){
  if(!busy(s)||s.owner!==sender.tab?.id||s.runId!==msg.runId||s.index!==msg.index)throw Error('이전 실행의 요청이거나 실행 창이 아닙니다.');
}
function requireEditable(s){if(s.status==='paused'||busy(s))throw Error('목록을 바꾸려면 먼저 실행 초기화를 눌러주세요.');}
function edit(s){s.index=0;s.status='idle';s.phase='video';s.runId=null;s.owner=null;s.note='오늘 목록을 수정했습니다.';}
async function handle(msg,sender){
  if(!sender.tab||!sender.url?.startsWith(HOME))throw Error('LMS 페이지에서만 사용할 수 있습니다.');
  const s=await read();
  switch(msg.type){
    case 'GET':return s;
    case 'ADD':{
      requireEditable(s);
      if(!Array.isArray(msg.items)||msg.items.length>100)throw Error('한 번에 최대 100개를 추가할 수 있습니다.');
      for(const item of msg.items){
        if(!validId(item.id)||!validId(item.courseId)||typeof item.title!=='string'||typeof item.course!=='string')throw Error('영상 정보가 올바르지 않습니다.');
      }
      if(s.items.length+msg.items.filter(x=>!s.items.some(y=>y.id===x.id)).length>100)throw Error('전체 영상은 최대 100개까지 선택할 수 있습니다.');
      for(const item of msg.items)if(!s.items.some(x=>x.id===item.id))s.items.push({id:item.id,courseId:item.courseId,title:item.title.slice(0,500),course:item.course.slice(0,150)});
      edit(s);s.note=`오늘 목록에 총 ${s.items.length}개가 있습니다.`;return write(s);
    }
    case 'REMOVE':requireEditable(s);s.items=s.items.filter(x=>x.id!==msg.id);edit(s);return write(s);
    case 'MOVE':{
      requireEditable(s);const i=s.items.findIndex(x=>x.id===msg.id),j=i+msg.direction;
      if(![-1,1].includes(msg.direction)||i<0||j<0||j>=s.items.length)return s;
      [s.items[i],s.items[j]]=[s.items[j],s.items[i]];edit(s);return write(s);
    }
    case 'RESET':s.index=0;s.status='idle';s.phase='video';s.owner=null;s.runId=null;s.note='실행을 초기화했습니다. 선택 목록은 유지됩니다.';return write(s);
    case 'CLEAR':requireEditable(s);return write(fresh());
    case 'START':{
      if(busy(s))throw Error('이미 실행 중입니다. 기존 창에서 중지해주세요.');
      if(!s.items.length)throw Error('영상을 먼저 추가해주세요.');
      if(s.status!=='paused')s.index=0;
      if(s.index>=s.items.length)s.index=0;
      s.status='running';s.phase='video';s.owner=sender.tab.id;s.runId=crypto.randomUUID();s.note='선택한 영상을 여는 중입니다.';
      return navigate(s,videoUrl(s.items[s.index]));
    }
    case 'STOP':if(busy(s))return pause(s,'사용자가 중지했습니다. 현재 영상부터 이어서 시작할 수 있습니다.');return s;
    case 'READY':{
      if(!busy(s)||s.owner!==sender.tab.id)return s;
      const u=new URL(sender.url);
      const atHome=['/','/index.php'].includes(u.pathname);
      if(s.status==='finishing'){
        if(!atHome)return pause(s,'완료 화면으로 이동하지 못했습니다.');
        s.status='done';s.note=`선택한 영상 ${s.items.length}개의 재생을 모두 마쳤습니다.`;s.completedAt=Date.now();return write(s);
      }
      if(s.phase==='home'){
        if(!atHome)return pause(s,'과목 전환 중 홈페이지를 확인하지 못했습니다.');
        s.note=`과목 전환 · 다음: ${s.items[s.index].course}`;return write(s);
      }
      if(!/^\/mod\/vod\/(view|viewer)\.php$/.test(u.pathname)||u.searchParams.get('id')!==s.items[s.index]?.id)return pause(s,'선택한 영상과 다른 화면으로 이동해서 중지했습니다.');
      return s;
    }
    case 'HOME_CONTINUE':requireRun(s,msg,sender);if(s.phase!=='home')return s;s.phase='video';s.note='다음 과목의 영상을 여는 중입니다.';return navigate(s,videoUrl(s.items[s.index]));
    case 'ENDED':{
      requireRun(s,msg,sender);if(s.status!=='running'||s.phase!=='video')throw Error('영상 종료를 기다리는 상태가 아닙니다.');
      const u=new URL(sender.url);if(u.searchParams.get('id')!==s.items[s.index].id)throw Error('현재 영상이 일치하지 않습니다.');
      const previous=s.items[s.index];s.index++;
      if(s.index>=s.items.length){s.status='finishing';s.note='전체 재생 완료 · 홈페이지로 돌아갑니다.';return navigate(s,HOME);}
      const next=s.items[s.index];
      if(previous.courseId!==next.courseId){s.phase='home';s.note='과목을 바꾸기 위해 홈페이지로 돌아갑니다.';return navigate(s,HOME);}
      s.note='다음 선택 영상으로 이동합니다.';return navigate(s,videoUrl(next));
    }
    case 'ERROR':requireRun(s,msg,sender);return pause(s,String(msg.note||'화면을 확인할 수 없어 중지했습니다.').slice(0,300));
    default:throw Error('알 수 없는 요청입니다.');
  }
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  serial(()=>handle(msg,sender)).then(state=>respond({ok:true,state,tabId:sender.tab.id}),e=>respond({ok:false,error:e.message}));return true;
});
chrome.tabs.onRemoved.addListener(id=>serial(async()=>{const s=await read();if(s.owner===id&&busy(s))await pause(s,'실행 창이 닫혀 중지했습니다. 홈페이지에서 이어서 시작해주세요.');}));
chrome.runtime.onStartup.addListener(()=>serial(async()=>{const s=await read();if(busy(s))await pause(s,'브라우저가 다시 시작되었습니다. 이어서 시작을 눌러주세요.');}));
