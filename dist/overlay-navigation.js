// Give full-screen experiences one Back step, without changing the page URL.
// A replacement overlay waits for a pending history.back() before adding its step.
export function createOverlayNavigation(host){
 let active=null,closing=null,serial=0;
 const key='admerestOverlay';
 host.addEventListener('popstate',()=>{
  if(closing){const done=closing;closing=null;done.resolve();return;}
  if(active&&host.history.state?.[key]!==active.id){const entry=active;active=null;entry.closed=true;entry.onBack();}
 });
 host.addEventListener('pagehide',()=>{
  if(active){const entry=active;active=null;entry.closed=true;entry.onBack();}
 });
 return onBack=>{
  const entry={id:`${Date.now()}-${++serial}`,onBack,closed:false,pushed:false,done:Promise.resolve()};
  const push=()=>{
   if(entry.closed)return;
   try{host.history.pushState({...host.history.state,[key]:entry.id},'');entry.pushed=true;active=entry;}catch{}
  };
  if(closing)closing.promise.then(push);else push();
  return ()=>{
   if(entry.closed)return entry.done;
   entry.closed=true;if(active===entry)active=null;
   if(entry.pushed&&host.history.state?.[key]===entry.id){
    let resolve;const promise=new Promise(done=>resolve=done);closing={promise,resolve};entry.done=promise;host.history.back();
   }
   return entry.done;
  };
 };
}
let track;
export function trackOverlay(onBack){
 if(!globalThis.window?.history?.pushState)return ()=>Promise.resolve();
 track??=createOverlayNavigation(window);return track(onBack);
}
