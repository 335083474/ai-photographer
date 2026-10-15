(() => {
  const $=selector=>document.querySelector(selector);
  const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={original:'原片',natural:'自然修好',photographer:'摄影师优化',creative:'创意重拍'};
  const levels=['natural','photographer','creative'];
  const staticPreview=window.LIGHT_ISLE_STATIC_PREVIEW===true;
  const assetUrl=value=>new URL(value.replace(/^\/+/,''),new URL('./',location.href)).href;
  const summaries={natural:'轻调光线与色彩',photographer:'更突出主体与层次',creative:'尝试新的视角与氛围'};
  const jobKey='light-isle-journey-job',sampleKey='light-isle-journey-sample';
  let cases=[],heroLevel='creative',current=null,session=null,generation=0,uploading=false,config={mode:'demo'},toastTimer,checkoutSelection=null;
  const objectUrls=new Set();
  const stored=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
  const save=(key,value)=>{try{if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}catch{}};
  session=stored(jobKey);if(staticPreview||!session?.id||!session?.token)session=null;
  function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
  async function request(url,options={},auth=session){
    const response=await fetch(url,{...options,headers:{...(auth?{Authorization:`Bearer ${auth.token}`} :{}),...options.headers}});
    if(!response.ok){let message='暂时没有完成，请重试。';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
    return response;
  }
  function clearUrls(){for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls.clear();}
  async function imageUrl(url,auth){const blob=await(await request(url,{},auth)).blob();const value=URL.createObjectURL(blob);objectUrls.add(value);return value;}
  function refreshResume(){$('#resume-task').hidden=!$('#workspace').hidden||!(current||session);}
  function showWorkspace(){
    $('#landing').hidden=true;$('#workspace').hidden=false;$('.sticky-upload').hidden=true;refreshResume();
    history.replaceState(null,'','#workspace');window.scrollTo({top:0,behavior:'instant'});
  }
  function showHome(anchor=''){
    $('#workspace').hidden=true;$('#landing').hidden=false;refreshResume();
    history.replaceState(null,'',anchor?'#'+anchor:location.pathname);
    if(anchor)$('#'+anchor)?.scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo({top:0,behavior:'instant'});
    refreshSticky();
  }
  function refreshSticky(){const r=$('.hero').getBoundingClientRect();$('.sticky-upload').hidden=!$('#workspace').hidden||r.bottom>0;}
  function setHero(level){
    if(!cases.length)return;heroLevel=level;const item=cases[0];
    $('#hero-image').src=item.images[level].url;$('#hero-image').alt=`${item.title} · ${names[level]}`;
    $('#hero-original').src=item.images.original.url;$('#hero-image-label').textContent=names[level];
    $('#hero-change').textContent=level==='original'?'逆光下，人物偏暗的合成原片。':item.notes[levels.indexOf(level)];
    document.querySelectorAll('[data-hero-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heroLevel===level)));
  }
  function renderGallery(type='all'){
    const visible=type==='all'?cases:cases.filter(c=>c.type===type),gallery=$('#gallery');
    gallery.classList.toggle('filtered',type!=='all');gallery.style.setProperty('--columns',Math.min(visible.length,2));
    gallery.innerHTML=visible.map(c=>`<article class="wall-card"><button class="case-photo" data-case="${E(c.id)}" style="--ratio:${c.images[c.level].width/c.images[c.level].height}" aria-label="查看${E(c.title)}的原片和三档结果"><span class="case-photos"><figure><img src="${E(c.images.original.url)}" alt="${E(c.label)}原片" loading="lazy"><figcaption class="photo-label">原片</figcaption></figure><figure><img src="${E(c.images[c.level].url)}" alt="${E(c.title)} · ${names[c.level]}" loading="lazy"><figcaption class="photo-label accent">${names[c.level]}</figcaption></figure></span><span class="case-open" aria-hidden="true">↗</span></button><div class="case-info"><div class="case-heading-line"><span>${E(c.label)} / ${E(c.focus)}</span><span>0${cases.indexOf(c)+1}</span></div><h3>${E(c.title)}</h3><small>${E(c.source)}</small></div></article>`).join('');
  }
  function openSample(id){
    const item=cases.find(c=>c.id===id);if(!item)return;
    generation++;clearUrls();
    current={kind:'sample',caseId:id,title:item.title,source:item.source,original:item.images.original.url,selected:item.level,showOriginal:false,tip:item.tip,
      variants:levels.map((level,i)=>({id:level,name:names[level],status:'ready',preview:item.images[level].url,download:item.images[level].url,width:item.images[level].width,height:item.images[level].height,sha256:item.images[level].sha256,note:item.notes[i],description:summaries[level]}))};
    save(sampleKey,{id,selected:current.selected});renderResults();showWorkspace();
  }
  function renderResults(){
    if(!current?.variants)return;
    $('#workspace-title').textContent='三种可能，选你喜欢的。';$('#workspace-eyebrow').textContent=current.kind==='sample'?'示例照片 / '+current.title:'我的照片';
    $('#workspace-source').textContent=current.source;
    const notice=current.kind==='sample'?'这些是已经生成的 AI 测试结果。点击一张，再与原片对比。':'本地演示：这三张使用调色与裁剪，未实际改变人物动作或场景。';
    const content=$('#workspace-content');
    content.innerHTML=`<p class="workspace-notice">${E(notice)}</p><div class="result-grid" role="group" aria-label="选择修图版本">${current.variants.map((v,i)=>`<button class="result-card" data-version="${v.id}" aria-pressed="false" ${v.status!=='ready'?'disabled':''}><div class="result-thumb">${v.preview?`<img src="${E(v.preview)}" alt="${E(v.name)}结果">`:'<span>此版本未完成</span>'}<span class="result-number">0${i+1}</span><span class="result-chosen" hidden>已选 ✓</span></div><div class="result-copy"><h3>${E(v.name)}</h3><p>${E(v.description||'此版本未完成')}</p></div></button>`).join('')}</div>
      <div class="selected-layout"><div><div class="view-toolbar"><span id="selected-view-name"></span><button class="text-action" id="toggle-original" aria-pressed="false">查看原片 ↔</button></div><div class="selected-stage"><img id="selected-image" alt=""><span class="watermark" aria-hidden="true">LIGHT ISLE · PREVIEW</span><span class="photo-caption" id="selected-image-label"></span></div></div>
      <aside class="result-sidebar"><p class="kicker">你选中的这一张</p><h2 id="selected-name"></h2><p class="selected-note" id="selected-note"></p><p class="result-meta" id="selected-meta"></p><button class="button primary" id="open-checkout">选这张，确认下载 <span aria-hidden="true">↗</span></button><p class="download-hint">当前体验免费 · 下载同一版 · 无需登录</p><div class="other-choice"><p>还没找到喜欢的？可以看看另外两个版本，或换张照片。</p><button class="text-action" data-upload>换张照片试试 ↗</button></div><details class="photo-tip"><summary>下次拍照，可以试试</summary><p>${E(current.tip)}</p></details></aside></div>
      <div class="result-footer"><span>${current.kind==='sample'?'示例结果仅用于体验；人物、场景或商品细节仍需复核。':current.kind==='browser'?'照片只在当前浏览器内处理，刷新或关闭后清除，不上传到服务器。':'照片只保存在本机服务，最长 24 小时，可随时删除。'}</span><button class="text-action" id="clear-result">${current.kind==='sample'?'清除示例选择':'删除本次照片'}</button></div>`;
    const available=current.variants.filter(v=>v.status==='ready');
    if(!available.some(v=>v.id===current.selected))current.selected=available[0]?.id;
    if(!current.selected){errorState(new Error('三个版本均未完成，请换一张照片重试。'));return;}
    content.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>choose(b.dataset.version));
    $('#toggle-original').onclick=()=>{current.showOriginal=!current.showOriginal;updateSelection();};
    $('#open-checkout').onclick=openCheckout;$('#clear-result').onclick=clearResult;
    if(current.kind==='upload'&&current.mode!=='demo'){$('#open-checkout').disabled=true;$('#open-checkout').textContent='真实支付尚未接入';$('.download-hint').textContent='当前仅可预览，暂不开放真实付费下载。';}
    updateSelection();refreshResume();
  }
  function choose(id){current.selected=id;current.showOriginal=false;if(current.kind==='sample')save(sampleKey,{id:current.caseId,selected:id});else if(session){session.selected=id;save(jobKey,session);}updateSelection();}
  function updateSelection(){
    const v=current.variants.find(x=>x.id===current.selected);if(!v)return;
    document.querySelectorAll('[data-version]').forEach(b=>{const active=b.dataset.version===current.selected;b.setAttribute('aria-pressed',String(active));b.querySelector('.result-chosen').hidden=!active;});
    $('#selected-view-name').textContent=`已选择 · ${v.name}`;$('#selected-image').src=current.showOriginal?current.original:v.preview;
    $('#selected-image').alt=current.showOriginal?'原片':`${v.name}所选结果预览`;$('#selected-image-label').textContent=current.showOriginal?'原片':v.name;
    $('#toggle-original').textContent=current.showOriginal?'返回所选结果 ↔':'查看原片 ↔';$('#toggle-original').setAttribute('aria-pressed',String(current.showOriginal));
    $('.watermark').hidden=current.showOriginal;$('#selected-name').textContent=v.name;$('#selected-note').textContent=v.note;
    $('#selected-meta').textContent=`${v.width} × ${v.height} px · ${current.kind==='sample'?'示例原尺寸':'JPEG'} · ${current.kind==='sample'?'人工测试结果':'本地演示结果'}`;
  }
  function openCheckout(){
    const v=current.variants.find(x=>x.id===current.selected);if(!v||v.status!=='ready')return;
    checkoutSelection={kind:current.kind,caseId:current.caseId,variant:{...v},session:current.kind==='upload'?{...session}:null};
    $('#checkout-image').src=v.preview;$('#checkout-name').textContent=v.name;$('#checkout-meta').textContent=`${v.width} × ${v.height} px · ${current.kind==='sample'?'示例照片':'我的照片'}`;
    $('#download-status').textContent='';$('#checkout-dialog').showModal();
  }
  async function downloadSelected(){
    if(!checkoutSelection)return;const selection=checkoutSelection,button=$('#download-button');button.disabled=true;$('#download-status').textContent='正在准备所选的同一版照片…';
    try{
      let response;
      if(selection.kind==='sample')response=await request(staticPreview?selection.variant.download:`/api/examples/${encodeURIComponent(selection.caseId)}/${selection.variant.id}/download`,{},null);
      else if(selection.kind==='browser')response=await fetch(selection.variant.preview);
      else{
        const receipt=await(await request(`/api/jobs/${selection.session.id}/checkout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:selection.variant.id})},selection.session)).json();
        if(receipt.charged!==false||receipt.variant!==selection.variant.id)throw new Error('下载确认与所选版本不一致，请重试。');
        response=await request(receipt.download,{},selection.session);
      }
      const blob=await response.blob();
      if(selection.variant.sha256){
        if(!staticPreview&&response.headers.get('X-Image-SHA256')!==selection.variant.sha256)throw new Error('示例文件与所选记录不一致，请刷新重试。');
        if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==selection.variant.sha256)throw new Error('示例文件已变化，请刷新后重新选择。');}
      }
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
      const ext=blob.type.includes('png')?'png':'jpg';a.download=`light-isle-${selection.kind==='sample'?'sample-':''}${selection.variant.id}.${ext}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      $('#download-status').textContent='下载已开始，本次没有收费。';toast('已下载所选版本 · 本次免费');
    }catch(e){$('#download-status').textContent=e.message;}finally{button.disabled=false;}
  }
  function progress(status='queued'){
    const titles={queued:'照片收到了。',analyzing:'正在看看这张照片。',editing:'正在准备三种效果。'};
    $('#workspace-title').textContent='给你的照片一点时间。';$('#workspace-eyebrow').textContent='我的照片';$('#workspace-source').textContent='免登录 · 本地演示';
    $('#workspace-content').innerHTML=`<div class="workspace-progress" role="status"><span class="spinner" aria-hidden="true"></span><h2>${titles[status]||'正在准备。'}</h2><p>当前为本地调色与裁剪演示，暂未调用外部 AI。</p><button class="text-action" id="cancel-task">取消本次处理</button></div>`;
    $('#cancel-task').onclick=clearResult;
  }
  function errorState(error){
    $('#workspace-title').textContent='这次还没有完成。';$('#workspace-content').innerHTML=`<div class="error-state"><h2>再试一下？</h2><p role="alert">${E(error.message)}</p><div class="error-actions"><button class="button primary" data-upload>重新选择照片 ↗</button>${session?`<button class="text-action" id="retry-task">${current?.pending?'恢复上次照片结果':'重新获取当前结果'}</button>`:''}<button class="text-action" id="error-back">回到首页</button></div></div>`;
    $('#retry-task')?.addEventListener('click',resumeJob);$('#error-back').onclick=()=>showHome();
  }
  async function poll(turn,auth){
    try{while(turn===generation){
      const job=await(await request(`/api/jobs/${auth.id}`,{},auth)).json();if(turn!==generation)return;
      if(['ready','partial'].includes(job.status)){
        const available=job.variants.filter(v=>v.status==='ready');
        const [original,...previews]=await Promise.all([imageUrl(`/api/jobs/${auth.id}/original`,auth),...available.map(v=>imageUrl(`/api/jobs/${auth.id}/variants/${v.id}/preview`,auth))]);
        if(turn!==generation)return;
        const imageById=Object.fromEntries(available.map((v,i)=>[v.id,previews[i]]));
        current={kind:'upload',mode:job.mode,original,selected:current?.kind==='upload'?current.selected:'natural',showOriginal:false,source:job.mode==='demo'?'我的照片 · 本地演示':'我的照片',tip:job.analysis?.tips?.[0]?.advice||'多留一张稍宽的取景，给后期调整留出空间。',variants:job.variants.map(v=>({...v,preview:imageById[v.id],description:v.changes?.[0]||v.error||'未完成',note:(v.changes||[]).join('；')||v.error||'结果尚未完成。'}))};
        renderResults();return;
      }
      if(job.status==='failed')throw new Error(job.error||'处理暂时未完成，请换张照片再试。');
      progress(job.status);await new Promise(r=>setTimeout(r,650));
    }}catch(e){if(turn===generation)errorState(e);}
  }
  async function process(file){
    if(uploading){toast('照片正在上传，请稍候。');return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('请选择 JPG、PNG 或 WebP 格式的照片。');return;}
    if(file.size>20*1024*1024){toast('这张照片超过 20 MB，请选择小一些的文件。');return;}
    if(staticPreview){
      uploading=true;const turn=++generation;clearUrls();save(sampleKey,null);current={kind:'browser'};progress();showWorkspace();
      try{
        const {makeBrowserDemo}=await import('./browser-demo.js');
        const result=await makeBrowserDemo(file);
        if(turn!==generation)return;
        const asUrl=blob=>{const url=URL.createObjectURL(blob);objectUrls.add(url);return url;};
        current={kind:'browser',mode:'demo',source:'我的照片 · 浏览器本地演示',original:asUrl(result.original),selected:'natural',showOriginal:false,tip:'多留一张稍宽的取景，后期就有更多调整空间。',variants:result.variants.map(v=>({...v,status:'ready',name:names[v.id],preview:asUrl(v.blob),note:v.description}))};
        renderResults();
      }catch(e){if(turn===generation)errorState(e);}finally{uploading=false;}
      return;
    }
    uploading=true;const turn=++generation;clearUrls();save(sampleKey,null);current={kind:'upload',selected:'natural',pending:true};progress();showWorkspace();
    try{
      const job=await(await request('/api/jobs',{method:'POST',headers:{'Content-Type':file.type},body:file},null)).json();
      const auth={id:job.id,token:job.token};
      if(turn!==generation){await request(`/api/jobs/${auth.id}`,{method:'DELETE'},auth).catch(()=>{});return;}
      session=auth;current.pending=false;save(jobKey,session);refreshResume();void poll(turn,auth);
    }catch(e){if(turn===generation)errorState(e);}finally{uploading=false;}
  }
  async function resumeJob(){if(!session)return;const turn=++generation;clearUrls();current={kind:'upload',selected:session.selected||'natural'};progress();showWorkspace();void poll(turn,{...session});}
  async function clearResult(){
    if(current?.kind==='sample'){generation++;current=null;save(sampleKey,null);showHome();return;}
    if(current?.kind==='browser'){generation++;clearUrls();current=null;showHome();toast('浏览器中的照片和结果已清除。');return;}
    if(current?.pending){generation++;current=null;showHome();toast('已取消本次上传。');return;}
    generation++;
    try{if(session)await request(`/api/jobs/${session.id}`,{method:'DELETE'},session);session=null;current=null;save(jobKey,null);clearUrls();showHome();toast('本次照片与结果已从本机服务删除。');}
    catch(e){toast(e.message);errorState(e);}
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-upload]'))$('#file-input').click();});
  $('#file-input').addEventListener('change',()=>{const file=$('#file-input').files?.[0];$('#file-input').value='';if(file)void process(file);});
  const drop=$('#upload-drop');
  ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('drag-over');}));
  ['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('drag-over');}));
  drop.addEventListener('drop',e=>{const file=e.dataTransfer.files?.[0];if(file)void process(file);});
  window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>{if(!drop.contains(e.target))e.preventDefault();});
  document.querySelectorAll('[data-hero-level]').forEach(b=>b.onclick=()=>setHero(b.dataset.heroLevel));
  document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-type]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGallery(b.dataset.type);});
  $('#gallery').addEventListener('click',e=>{const b=e.target.closest('[data-case]');if(b)openSample(b.dataset.case);});
  $('#try-sample').onclick=()=>openSample(cases[0]?.id);$('#open-hero-case').onclick=()=>openSample(cases[0]?.id);
  $('.brand').addEventListener('click',e=>{e.preventDefault();showHome();});$('#back-home').onclick=()=>showHome();
  document.querySelectorAll('[data-home-anchor]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showHome(a.dataset.homeAnchor);}));
  $('#resume-task').onclick=()=>{if(current?.variants){renderResults();showWorkspace();}else if(session)void resumeJob();};
  $('#close-checkout').onclick=()=>$('#checkout-dialog').close();$('#download-button').onclick=downloadSelected;
  $('#checkout-dialog').addEventListener('click',e=>{if(e.target===$('#checkout-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  if('IntersectionObserver' in window)new IntersectionObserver(refreshSticky).observe($('.hero'));
  window.addEventListener('pagehide',event=>{if(!event.persisted)clearUrls();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&current?.kind==='upload'&&session)void resumeJob();});
  async function initialize(){
    try{
      const response=await fetch('journey-cases.json');if(!response.ok)throw new Error('案例暂时没有加载成功，请刷新重试。');
      const data=await response.json();cases=data.cases;
      for(const c of cases)for(const image of Object.values(c.images))image.url=assetUrl(image.url);
      setHero(heroLevel);renderGallery();
      const previous=stored(sampleKey);
      if(location.hash==='#workspace'){
        if(previous&&cases.some(c=>c.id===previous.id)){openSample(previous.id);if(levels.includes(previous.selected))choose(previous.selected);}
        else if(session)void resumeJob();else showHome();
      }
      refreshResume();refreshSticky();
    }catch(e){$('#gallery').innerHTML=`<p class="loading" role="alert">${E(e.message)}</p>`;$('#try-sample').disabled=true;$('#open-hero-case').disabled=true;toast(e.message);}
    if(staticPreview){
      $('.demo-notice').textContent='当前体验免费。示例为实际 AI 编辑；你的照片仅在浏览器内调色裁剪，不上传服务器。';
      const p=document.querySelectorAll('.question-list details p');
      p[1].textContent='不会。你的照片只在当前浏览器内处理，不上传 GitHub 或其他服务器，也不会加入照片墙。刷新或关闭页面后清除。';
      p[3].textContent='示例可比较已经生成的三档 AI 成片。自己的照片可体验浏览器本地调色裁切、三档选择与下载；自动 AI 编辑和真实支付未接入，无需登录。';
      return;
    }
    try{config=await(await fetch('/api/config')).json();if(config.mode!=='demo'){
      $('.demo-notice').textContent='示例为人工编排的 AI 测试。上传会交由配置的 AI 服务处理；真实支付尚未接入。';
      const paragraphs=document.querySelectorAll('.question-list details p');paragraphs[1].textContent='照片不会公开展示。真实模式会发送给配置的 AI 服务，本机副本最长保留 24 小时，可删除；外部提供方的记录按其规则处理。';
    }}catch{}
  }
  void initialize();
})();
