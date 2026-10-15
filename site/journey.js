import {i18n,applyTranslations} from './i18n.js?v=aftercare-20261015';
import {createZip} from './zip.js';
import {aftercareMarkup,bindFeedback} from './aftercare-ui.js?v=aftercare-20261015';
import {normalizeFeedback} from './feedback.js';

(() => {
  const $=selector=>document.querySelector(selector);
  const t=i18n.t;
  const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={original:t('levels.original'),natural:t('levels.natural'),photographer:t('levels.photographer'),creative:t('levels.creative')};
  const levels=['natural','photographer','creative'];
  const apiBase=(window.LIGHT_ISLE_API_BASE_URL||'').replace(/\/+$/,'');
  const staticPreview=window.LIGHT_ISLE_STATIC_PREVIEW===true&&!apiBase;
  const apiUrl=url=>apiBase&&url.startsWith('/api/')?apiBase+url:url;
  const assetUrl=value=>new URL(value.replace(/^\/+/,''),new URL('./',location.href)).href;
  const summaries={natural:t('levels.naturalSummary'),photographer:t('levels.photographerSummary'),creative:t('levels.creativeSummary')};
  const jobKey='light-isle-journey-job',sampleKey='light-isle-journey-sample',orderKey='light-isle-journey-order';
  let cases=[],heroLevel='natural',current=null,session=null,generation=0,uploading=false,config={mode:'demo',payments:{enabled:false}},backendReady=staticPreview,toastTimer,checkoutSelection=null,pendingOrder=null;
  const allVariants=()=>[...(current?.variants||[]),...(current?.revisions||[]).filter(v=>v.status==='ready')];
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let heroTurn=0,heroTimer,heroPaused=reducedMotion.matches,heroHovered=false,heroVisible=true,heroLoading=false,heroDisplayed=null,heroTouch=null;
  const heroCase=()=>cases.find(item=>item.id==='01_backlit_portrait');
  function nextHeroLevel(direction){const index=levels.indexOf(heroLevel);return levels[index<0?(direction>0?0:levels.length-1):(index+direction+levels.length)%levels.length];}
  const heroImages=new Map();
  const objectUrls=new Set();
  const stored=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
  const save=(key,value)=>{try{if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);return true;}catch{return false;}};
  session=stored(jobKey);if(staticPreview||!session?.id||!session?.token||(session.apiBase||'')!==apiBase)session=null;
  pendingOrder=stored(orderKey);if(staticPreview||!session||pendingOrder?.jobId!==session.id)pendingOrder=null;
  function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
  async function request(url,options={},auth=session){
    const response=await fetch(apiUrl(url),{...options,credentials:'omit',headers:{...(auth?{Authorization:`Bearer ${auth.token}`} :{}),...options.headers}});
    if(!response.ok){let message='暂时没有完成，请重试。';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
    return response;
  }
  function clearUrls(){for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls.clear();}
  async function imageUrl(url,auth){const blob=await(await request(url,{},auth)).blob();const value=URL.createObjectURL(blob);objectUrls.add(value);return value;}
  function refreshResume(){$('#resume-task').hidden=!$('#workspace').hidden||!(current||session);}
  function showWorkspace(){
    $('#landing').hidden=true;$('#workspace').hidden=false;$('.sticky-upload').hidden=true;refreshResume();scheduleHero();
    history.replaceState(null,'','#workspace');window.scrollTo({top:0,behavior:'instant'});
  }
  function showHome(anchor=''){
    $('#workspace').hidden=true;$('#landing').hidden=false;refreshResume();
    history.replaceState(null,'',anchor?'#'+anchor:location.pathname);
    if(anchor)$('#'+anchor)?.scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo({top:0,behavior:'instant'});
    refreshSticky();scheduleHero();
  }
  function refreshSticky(){const r=$('.hero').getBoundingClientRect();$('.sticky-upload').hidden=!$('#workspace').hidden||r.bottom>0;}
  function loadHeroImage(url){
    if(!heroImages.has(url)){
      const ready=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>reject(new Error(t('hero.loadError')));image.src=url;});
      heroImages.set(url,ready);ready.catch(()=>heroImages.delete(url));
    }
    return heroImages.get(url);
  }
  function scheduleHero(){
    clearTimeout(heroTimer);
    $('#hero-rotation').textContent=t(heroPaused?'hero.play':'hero.pause');$('#hero-rotation').setAttribute('aria-label',t(heroPaused?'hero.play':'hero.pause'));
    if(!heroCase()||heroPaused||heroHovered||!heroVisible||heroLoading||document.hidden||$('#landing').hidden)return;
    heroTimer=setTimeout(()=>{void setHero(nextHeroLevel(1),{automatic:true});},7000);
  }
  function pauseHero(){heroPaused=true;scheduleHero();}
  function moveHero(direction){if(!heroCase())return;pauseHero();void setHero(nextHeroLevel(direction));}
  async function setHero(level,{automatic=false}={}){
    const item=heroCase();if(!item)return;heroLevel=level;const turn=++heroTurn;heroLoading=true;clearTimeout(heroTimer);
    const stage=$('.hero-photo-stage');stage.setAttribute('aria-busy','true');
    try{
      await Promise.all([loadHeroImage(item.images.original.url),loadHeroImage(item.images[level].url)]);
      if(turn!==heroTurn)return;
      $('#hero-original').src=item.images.original.url;$('#hero-original').alt=`${item.label}原片`;
      $('#hero-image').src=item.images[level].url;$('#hero-image').alt=`${item.title} · ${names[level]}`;
      $('#hero-image-label').textContent=names[level];
      $('#hero-change').textContent=level==='original'?t('hero.originalDescription'):t(`cases.${item.id}.notes.${level}`,{},item.notes[levels.indexOf(level)]);
      $('#hero-source').textContent=t('hero.source',{source:t(`cases.${item.id}.source`,{},item.source)});
      $('.hero-example').setAttribute('aria-label',t('hero.comparisonLabel',{subject:t(`cases.${item.id}.label`,{},item.label),name:names[level]}));stage.dataset.case=item.id;stage.dataset.level=level;heroDisplayed=item;
      document.querySelectorAll('[data-hero-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heroLevel===level)));
      if(!automatic)$('#hero-slide-status').textContent=level==='original'?t('hero.originalStatus'):t('hero.levelStatus',{index:levels.indexOf(level)+1,name:names[level]});
      if(!reducedMotion.matches&&$('.hero-after').animate)$('.hero-after').animate([{opacity:.6},{opacity:1}],{duration:280,easing:'ease-out'});
    }catch(e){if(turn===heroTurn){heroPaused=true;toast(e.message);}}
    finally{if(turn===heroTurn){heroLoading=false;stage.setAttribute('aria-busy','false');scheduleHero();}}
  }
  function renderGallery(type='all'){
    const visible=type==='all'?cases:cases.filter(c=>c.type===type),gallery=$('#gallery');
    gallery.classList.toggle('filtered',type!=='all');gallery.style.setProperty('--columns',Math.min(visible.length,2));
    gallery.innerHTML=visible.map(c=>`<article class="wall-card"><button class="case-photo" data-case="${E(c.id)}" style="--ratio:${c.images[c.level].width/c.images[c.level].height}" aria-label="查看${E(c.title)}的原片和三档结果"><span class="case-photos"><figure><img src="${E(c.images.original.url)}" alt="${E(c.label)}原片" loading="lazy"><figcaption class="photo-label">原片</figcaption></figure><figure><img src="${E(c.images[c.level].url)}" alt="${E(c.title)} · ${E(names[c.level])}" loading="lazy"><figcaption class="photo-label accent">${E(names[c.level])}</figcaption></figure></span><span class="case-open" aria-hidden="true">↗</span></button><div class="case-info"><div class="case-heading-line"><span>${E(c.label)} / ${E(c.focus)}</span><span>0${cases.indexOf(c)+1}</span></div><h3>${E(c.title)}</h3><small>${E(c.source)}</small></div></article>`).join('');
  }
  function openSample(id){
    const item=cases.find(c=>c.id===id);if(!item)return;
    generation++;clearUrls();
    current={kind:'sample',caseId:id,title:item.title,source:item.source,original:item.images.original.url,selected:item.level,showOriginal:false,tip:item.tip,subjects:item.type==='people-landscape'?['portrait','landscape']:item.type==='portrait'?['portrait']:[item.type],revisions:[],
      variants:levels.map((level,i)=>({id:level,name:names[level],status:'ready',preview:item.images[level].url,download:item.images[level].url,width:item.images[level].width,height:item.images[level].height,sha256:item.images[level].sha256,note:item.notes[i],description:summaries[level]}))};
    save(sampleKey,{id,selected:current.selected});renderResults();showWorkspace();
  }
  function renderResults(){
    if(!current?.variants)return;
    $('#workspace-title').textContent=t('workspace.title');$('#workspace-eyebrow').textContent=current.kind==='sample'?t('workspace.sample',{title:current.title}):t('workspace.myPhoto');
    $('#workspace-source').textContent=current.source+((current.revisions||[]).some(v=>v.localRevision)?' · 补做为本地演示':'');
    const notice=current.kind==='sample'?'这些是已经生成的 AI 测试结果。点击一张，再与原片对比。':current.mode==='real'?'已完成版本经过自动复核，请再确认人物、文字与场景细节；未通过的版本不会提供下载。':'本地演示：这三张使用调色与裁剪，未实际改变人物动作或场景。';
    const content=$('#workspace-content');
    content.innerHTML=`<p class="workspace-notice">${E(notice)}</p><div class="result-grid" role="group" aria-label="选择修图版本">${current.variants.map((v,i)=>`<button class="result-card" data-version="${v.id}" aria-pressed="false" ${v.status!=='ready'?'disabled':''}><div class="result-thumb">${v.preview?`<img src="${E(v.preview)}" alt="${E(v.name)}结果">`:'<span>此版本未完成</span>'}<span class="result-number">0${i+1}</span><span class="result-chosen" hidden>查看中</span></div><div class="result-copy"><h3>${E(v.name)}</h3><p>${E(v.description||'此版本未完成')}</p></div></button>`).join('')}</div>
      <div class="selected-layout"><div><div class="view-toolbar"><span id="selected-view-name"></span><button class="text-action" id="toggle-original" aria-pressed="false">查看原片 ↔</button></div><div class="selected-stage"><img id="selected-image" alt=""><span class="watermark" aria-hidden="true">LIGHT ISLE · PREVIEW</span><span class="photo-caption" id="selected-image-label"></span></div></div>
      <aside class="result-sidebar"><p class="kicker">正在查看的效果</p><h2 id="selected-name"></h2><p class="selected-note" id="selected-note"></p><p class="result-meta" id="selected-meta"></p><button class="button primary" id="open-checkout">${E(t('bundle.download'))} <span aria-hidden="true">↗</span></button><p class="download-hint">${E(t('bundle.demoHint'))}</p><div class="other-choice"><p>还没找到喜欢的？可以看看另外两个版本，或换张照片。</p><button class="text-action" data-upload>换张照片试试 ↗</button></div><details class="photo-tip"><summary>下次拍照，可以试试</summary><p>${E(current.tip)}</p></details></aside></div>
      <div class="result-footer"><span>${current.kind==='sample'?'示例结果仅用于体验；人物、场景或商品细节仍需复核。':current.kind==='browser'?'照片只在当前浏览器内处理，刷新或关闭后清除，不上传到服务器。':current.mode==='real'?'照片仅用于本次处理，服务副本最长保留 24 小时，可随时删除，不会加入照片墙。':'照片只保存在本机服务，最长 24 小时，可随时删除。'}</span><button class="text-action" id="clear-result">${current.kind==='sample'?'清除示例选择':'删除本次照片'}</button></div>`;
    content.querySelector('.result-footer').insertAdjacentHTML('beforebegin',aftercareMarkup(current,t));
    bindFeedback(content,submitFeedback,current.feedbackDraft);
    const available=allVariants().filter(v=>v.status==='ready');
    if(!available.some(v=>v.id===current.selected))current.selected=available[0]?.id;
    if(!current.selected){errorState(new Error('三个版本均未完成，请换一张照片重试。'));return;}
    content.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>choose(b.dataset.version));
    $('#toggle-original').onclick=()=>{current.showOriginal=!current.showOriginal;updateSelection();};
    $('#open-checkout').onclick=openCheckout;$('#clear-result').onclick=clearResult;
    if(current.kind==='upload'&&current.mode!=='demo'){$('#open-checkout').textContent=config.payments?.enabled?'整套三张，查看价格 ↗':'付款服务尚未配置';$('#open-checkout').disabled=!config.payments?.enabled;$('.download-hint').textContent=!config.payments?.enabled?'当前可预览，付款配置后开放下载':config.payments.mode==='test'?'Stripe 测试付款 · 三张全拿 · 不会实际扣款':'一次付款 · 三张全拿 · Stripe 安全付款';}
    if(!levels.every(level=>available.some(v=>v.id===level))){$('#open-checkout').disabled=true;$('.download-hint').textContent='三个版本尚未全部完成，暂不能下载整套。';}
    if(available.length>3&&!$('#open-checkout').disabled){$('#open-checkout').textContent=`下载全部 ${available.length} 张 ↗`;$('.download-hint').textContent=`包含原来的三张和 ${available.length-3} 张补做结果。`;}
    updateSelection();refreshResume();
  }
  function choose(id){current.selected=id;current.showOriginal=false;if(current.kind==='sample')save(sampleKey,{id:current.caseId,selected:id});else if(session){session.selected=id;save(jobKey,session);}updateSelection();}
  function updateSelection(){
    const v=allVariants().find(x=>x.id===current.selected);if(!v)return;
    document.querySelectorAll('[data-version]').forEach(b=>{const active=b.dataset.version===current.selected;b.setAttribute('aria-pressed',String(active));b.querySelector('.result-chosen').hidden=!active;});
    $('#selected-view-name').textContent=t('workspace.selected',{name:v.name});$('#selected-image').src=current.showOriginal?current.original:v.preview;
    $('#selected-image').alt=current.showOriginal?t('workspace.original'):t('workspace.previewAlt',{name:v.name});$('#selected-image-label').textContent=current.showOriginal?t('workspace.original'):v.name;
    $('#toggle-original').textContent=t(current.showOriginal?'workspace.showResult':'workspace.showOriginal');$('#toggle-original').setAttribute('aria-pressed',String(current.showOriginal));
    $('.watermark').hidden=current.showOriginal;$('#selected-name').textContent=v.name;$('#selected-note').textContent=v.note;
    $('#selected-meta').textContent=`${v.width} × ${v.height} px · ${current.kind==='sample'?'示例原尺寸':'JPEG'} · ${v.localRevision?'浏览器本地补做演示':current.kind==='sample'?'人工测试结果':current.mode==='real'?'AI 编辑结果':'本地演示结果'}`;
  }
  function openCheckout(){
    const v=allVariants().find(x=>x.id===current.selected);if(!v||v.status!=='ready')return;
    if(!levels.every(level=>current.variants.some(item=>item.id===level&&item.status==='ready')))return;
    checkoutSelection={kind:current.kind,mode:current.mode,caseId:current.caseId,variant:{...v},variants:allVariants().filter(item=>item.status==='ready').map(item=>({...item})),session:current.kind==='upload'?{...session}:null};
    $('#checkout-bundle').replaceChildren(...checkoutSelection.variants.map(item=>{const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=item.preview;image.alt=item.name;caption.textContent=item.name;figure.append(image,caption);return figure;}));
    $('#checkout-name').textContent=t('bundle.includes');$('#checkout-meta').textContent=checkoutSelection.variants.length>3?`3 张原始版本＋${checkoutSelection.variants.length-3} 张补做 · ZIP 打包 · 本单不再收费`:t('bundle.meta');
    $('#checkout-title').textContent=checkoutSelection.variants.length>3?`全部 ${checkoutSelection.variants.length} 张，一起带走`:t('bundle.confirmTitle');
    const paidFlow=current.kind==='upload'&&current.mode!=='demo';
    $('.checkout-price>span').textContent=paidFlow?'三张整套':'本次体验';
    $('.checkout-price strong').innerHTML=paidFlow?`${E(priceFor())}<small>${config.payments?.mode==='test'?'Stripe 测试模式 · 不会实际扣款':'一次付款 · 三张全拿'}</small>`:`¥0 <small>${E(t('bundle.proposedPrice'))}</small>`;
    $('.checkout-disclosure').textContent=paidFlow?'一次付款包含自然修好、摄影师优化、创意重拍三个版本。Stripe 付款返回后，由后台核验订单；核验通过后打包下载三张原尺寸成片。请保留当前浏览器。':t('bundle.demoDisclosure');
    $('#download-button').disabled=false;$('#download-button').textContent=paidFlow?'前往 Stripe 付款 ↗':t('bundle.confirmFree');$('#payment-link').hidden=true;
    if(!paidFlow&&checkoutSelection.variants.length>3)$('#download-button').textContent=`确认并免费下载全部 ${checkoutSelection.variants.length} 张 ↓`;
    if(paidFlow&&!config.payments?.enabled){$('#download-button').disabled=true;$('.checkout-disclosure').textContent='付款服务尚未配置，当前只可预览。';}
    $('#download-status').textContent='';$('#checkout-dialog').showModal();
    if(paidFlow&&pendingOrder?.jobId===session.id&&pendingOrder.variant==='bundle')void watchPayment(checkoutSelection,pendingOrder);
  }
  function priceFor(){const amount=config.payments?.bundlePriceMinor;return Number.isSafeInteger(amount)?i18n.formatMoney(amount,config.payments.currency):'价格未配置';}
  function stripeUrl(value){const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password)throw new Error('付款链接无效，请稍后重试。');return url.href;}
  const activeCheckout=selection=>checkoutSelection===selection&&$('#checkout-dialog').open;
  function persistCheckout(selection,order){
    const auth={...selection.session,selected:selection.variant.id},pending={id:order.orderId,jobId:auth.id,variant:'bundle'};
    const savedJob=save(jobKey,auth),savedOrder=save(orderKey,pending),job=stored(jobKey),receipt=stored(orderKey);
    if(!savedJob||!savedOrder||job?.id!==auth.id||job?.token!==auth.token||job?.apiBase!==apiBase||receipt?.id!==pending.id||receipt?.jobId!==auth.id||receipt?.variant!==pending.variant)throw new Error('当前浏览器无法保存下载凭证，请允许当前会话存储后再付款。');
    session=auth;pendingOrder=pending;
  }
  async function watchPayment(selection,order){
    selection.waitingForPayment=true;const button=$('#download-button');button.disabled=true;$('#payment-link').hidden=true;
    try{for(let i=0;i<12;i++){
      if(!activeCheckout(selection))return;
      const state=await(await request(`/api/jobs/${selection.session.id}/orders/${encodeURIComponent(order.id)}`,{},selection.session)).json();
      if(!activeCheckout(selection))return;
      if(state.variant!=='bundle'||state.product!=='three-versions'||state.id!==order.id)throw new Error('订单与三张整套不一致。');
      if(state.status==='paid'){selection.order=state;$('#download-status').textContent=state.testPayment?'测试付款已核验，可下载整套；没有真实扣款。':'付款已核验，整套可下载。';button.textContent=selection.variants.length>3?`下载全部 ${selection.variants.length} 张原尺寸照片 ↓`:t('bundle.downloadOriginals');await refreshAftercare();return;}
      if(['expired','failed','refunded','disputed','review_required'].includes(state.status)){
        const messages={expired:'订单已过期，可重新发起付款。',failed:'付款未完成，可重新发起。',refunded:'订单已退款，原下载权限已撤销。',disputed:'订单正在处理支付争议，下载权限已暂停。',review_required:'订单需要人工核对，暂未开放下载。'};
        $('#download-status').textContent=messages[state.status];pendingOrder=null;save(orderKey,null);selection.paymentBlocked=['disputed','review_required'].includes(state.status);button.textContent=selection.paymentBlocked?'订单需人工核对':'重新前往付款 ↗';selection.waitingForPayment=false;selection.order=null;return;
      }
      $('#download-status').textContent='正在等待后台确认付款。返回地址中的状态不会直接开放下载。';
      if(state.checkoutUrl){$('#payment-link').href=stripeUrl(state.checkoutUrl);$('#payment-link').hidden=false;}
      if(i<11)await new Promise(r=>setTimeout(r,1500));
    }button.textContent='重新核验付款状态 ↻';
    }catch(e){if(activeCheckout(selection))$('#download-status').textContent=e.message;}finally{if(activeCheckout(selection))button.disabled=selection.paymentBlocked===true;}
  }
  async function downloadBundle(){
    if(!checkoutSelection||!activeCheckout(checkoutSelection))return;const selection=checkoutSelection,button=$('#download-button');button.disabled=true;$('#download-status').textContent=t('bundle.preparing');
    try{
      let receipt;
      if(selection.kind==='upload'){
        receipt=await(await request(`/api/jobs/${selection.session.id}/checkout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:'three-versions'})},selection.session)).json();
        if(!activeCheckout(selection))return;
        if(receipt.variant!=='bundle'||receipt.product!=='three-versions'||!Array.isArray(receipt.variants)||receipt.variants.length!==3||!levels.every(level=>receipt.variants.includes(level)))throw new Error('下载确认与三张整套不一致，请重试。');
        if(selection.mode!=='demo'){
          if(!['test','live'].includes(receipt.mode)||!receipt.orderId)throw new Error('付款订单尚未正确创建。');
          persistCheckout(selection,receipt);
          if(receipt.status!=='paid'){
            if(selection.order?.status==='paid')throw new Error('下载权限已变化，请重新核验订单。');
            if(selection.waitingForPayment){await watchPayment(selection,pendingOrder);return;}
            const target=stripeUrl(receipt.checkoutUrl);if(!activeCheckout(selection))return;selection.waitingForPayment=true;window.location.assign(target);return;
          }
          selection.order=receipt;
        }else if(receipt.charged!==false)throw new Error('演示下载确认不正确，请重试。');
      }
      const entries=[];
      for(const variant of selection.variants){
        if(!activeCheckout(selection))return;
        let response;
        if(variant.localRevision)response=await fetch(variant.preview);
        else if(selection.kind==='sample')response=await request(staticPreview||apiBase?variant.download:`/api/examples/${encodeURIComponent(selection.caseId)}/${variant.id}/download`,{},null);
        else if(selection.kind==='browser')response=await fetch(variant.preview);
        else{const expected=`/api/jobs/${selection.session.id}/${variant.id.startsWith('revision-')?'revisions':'variants'}/${variant.id}/download`;if(receipt.downloads?.[variant.id]!==expected)throw new Error('整套下载地址不一致。');response=await request(expected,{},selection.session);}
        if(!response.ok)throw new Error('照片下载失败，请重试。');
        const bytes=new Uint8Array(await response.arrayBuffer());
        if(variant.sha256){
          if(!staticPreview&&(selection.kind!=='sample'||!apiBase)&&response.headers.get('X-Image-SHA256')!==variant.sha256)throw new Error('下载文件与结果记录不一致，请刷新重试。');
          if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==variant.sha256)throw new Error('照片文件已变化，请刷新后重新确认。');}
        }
        const ext=response.headers.get('Content-Type')?.includes('png')?'png':'jpg';entries.push({name:`light-isle-${variant.id}.${ext}`,bytes});
      }
      if(!activeCheckout(selection))return;
      const blob=new Blob([createZip(entries)],{type:'application/zip'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
      a.download=selection.variants.length===3?`light-isle-${selection.kind==='sample'?'sample-':''}three-versions.zip`:`light-isle-${selection.variants.length}-photos.zip`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      const paid=selection.order?.status==='paid';if(paid)button.textContent=selection.variants.length>3?`下载全部 ${selection.variants.length} 张原尺寸照片 ↓`:t('bundle.downloadOriginals');const message=`全部 ${selection.variants.length} 张已开始下载。`+(paid?(selection.order.testPayment?'测试付款没有真实扣款。':''):'本次没有收费。');$('#download-status').textContent=message;toast(message);
      if(selection.kind==='upload')await refreshAftercare();else if(current&&current.kind===selection.kind&&current.caseId===selection.caseId){current.demoConfirmed=true;refreshDemoAftercare();renderResults();}
    }catch(e){if(activeCheckout(selection))$('#download-status').textContent=e.message;}finally{if(activeCheckout(selection))button.disabled=selection.paymentBlocked===true;}
  }
  function refreshDemoAftercare(){
    const used=(current.revisions||[]).filter(r=>r.status==='ready').length;
    current.aftercare={eligible:!!current.demoConfirmed,canRequest:!!current.demoConfirmed&&used<2&&!current.revisionBusy,max:2,used,remaining:2-used,active:current.revisionBusy?'local-demo':null,subjects:current.subjects||['other'],mode:'demo'};
  }
  async function refreshAftercare(render=true){
    if(current?.kind!=='upload'||!session)return;const target=current,auth={...session},turn=generation;
    const state=await(await request(`/api/jobs/${auth.id}/revisions`,{},auth)).json(),ready=state.eligible?state.revisions.filter(r=>r.status==='ready'):[];
    const previews=await Promise.all(ready.map(r=>imageUrl(`/api/jobs/${auth.id}/revisions/${r.id}/preview`,auth)));
    if(turn!==generation||current!==target)return;
    current.aftercare=state;current.subjects=state.subjects;current.revisions=state.revisions.map(r=>({...r,status:r.status==='ready'&&!state.eligible?'revoked':r.status,preview:ready.some(v=>v.id===r.id)?previews[ready.findIndex(v=>v.id===r.id)]:null,note:(r.changes||[]).join('；')||r.error,description:r.name}));
    if(render)renderResults();
  }
  async function submitFeedback(input){
    if(current?.revisionBusy||!current?.aftercare?.canRequest)return;
    const target=current,turn=generation;let feedback;
    try{feedback=normalizeFeedback(input,{bases:['none',...allVariants().map(v=>v.id)],subjects:current.aftercare.subjects||current.subjects});}catch(error){$('#feedback-error').textContent=error.message;return;}
    current.feedbackDraft=feedback;current.revisionBusy=true;
    const contentKey=JSON.stringify(feedback),requestId=current.pendingFeedback?.key===contentKey?current.pendingFeedback.id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    current.pendingFeedback={key:contentKey,id:requestId};
    try{
      if(current.kind==='upload'){
        await request(`/api/jobs/${session.id}/revisions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...feedback,requestId})},session);
        if(current!==target||turn!==generation)return;current.feedbackDraft=null;renderResults();
        do{await refreshAftercare(false);if(current!==target||turn!==generation)return;renderResults();if(current.aftercare.active)await new Promise(resolve=>setTimeout(resolve,document.hidden?4000:1000));}while(current===target&&current.aftercare.active);
      }else{
        const {makeDemoRevision}=await import('./revision-demo.js?v=aftercare-20261015');
        const base=allVariants().find(v=>v.id===feedback.base)?.preview||current.original;
        const result=await makeDemoRevision(base,feedback);if(current!==target||turn!==generation)return;
        const bytes=new Uint8Array(await result.blob.arrayBuffer());
        for(const old of current.revisions||[]){const prior=new Uint8Array(await old.blob.arrayBuffer());if(bytes.length===prior.length&&bytes.every((byte,i)=>byte===prior[i]))throw new Error('这个方向与已有补做相同，请换一个更具体的调整方向；未扣补做次数。');}
        const preview=URL.createObjectURL(result.blob);objectUrls.add(preview);
        current.revisions=[...(current.revisions||[]),{...result,id:`revision-${requestId}`,status:'ready',name:`补做 ${(current.revisions||[]).length+1}`,localRevision:true,preview,download:preview,description:result.note,feedback}];
        current.feedbackDraft=null;
      }
      if(current!==target||turn!==generation)return;current.pendingFeedback=null;toast(current.aftercare?.supportRequired?'本次补做未完成，未扣成功次数。':'补做完成，原来的三张仍然保留。');
    }catch(error){if(current===target&&turn===generation){current.revisionError=error.message;toast(error.message);}}
    finally{if(current===target&&turn===generation){current.revisionBusy=false;if(current.kind!=='upload')refreshDemoAftercare();renderResults();if(current.revisionError&&$('#feedback-error')){$('#feedback-error').textContent=current.revisionError;$('#aftercare-form').open=true;current.revisionError=null;}}}
  }
  function progress(status='queued'){
    const titles={queued:'照片收到了。',analyzing:'正在看看这张照片。',editing:'正在准备三种效果。'};
    $('#workspace-title').textContent='给你的照片一点时间。';$('#workspace-eyebrow').textContent='我的照片';$('#workspace-source').textContent=config.mode==='real'?'AI 正在处理':'免登录 · 本地演示';
    $('#workspace-content').innerHTML=`<div class="workspace-progress" role="status"><span class="spinner" aria-hidden="true"></span><h2>${titles[status]||'正在准备。'}</h2><p>${config.mode==='real'?'正在分析照片、准备三个版本并逐张检查。':'当前为本地调色与裁剪演示，暂未调用外部 AI。'}</p><button class="text-action" id="cancel-task">取消本次处理</button></div>`;
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
        await refreshAftercare(false);if(turn!==generation)return;renderResults();if(pendingOrder?.jobId===auth.id&&pendingOrder.variant==='bundle')openCheckout();return;
      }
      if(job.status==='failed')throw new Error(job.error||'处理暂时未完成，请换张照片再试。');
      progress(job.status);await new Promise(r=>setTimeout(r,650));
    }}catch(e){if(turn===generation)errorState(e);}
  }
  async function process(file){
    if(!backendReady){toast('照片服务尚未连接，请稍后刷新重试。');return;}
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
    uploading=true;const turn=++generation;clearUrls();save(sampleKey,null);pendingOrder=null;save(orderKey,null);current={kind:'upload',selected:'natural',pending:true};progress();showWorkspace();
    try{
      const job=await(await request('/api/jobs',{method:'POST',headers:{'Content-Type':file.type},body:file},null)).json();
      const auth={id:job.id,token:job.token,apiBase};
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
    try{if(session)await request(`/api/jobs/${session.id}`,{method:'DELETE'},session);session=null;current=null;pendingOrder=null;save(orderKey,null);save(jobKey,null);clearUrls();showHome();toast('本次照片与结果已从服务中删除。');}
    catch(e){toast(e.message);errorState(e);}
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-upload]'))$('#file-input').click();});
  $('#file-input').addEventListener('change',()=>{const file=$('#file-input').files?.[0];$('#file-input').value='';if(file)void process(file);});
  const drop=$('#upload-drop');
  ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('drag-over');}));
  ['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('drag-over');}));
  drop.addEventListener('drop',e=>{const file=e.dataTransfer.files?.[0];if(file)void process(file);});
  window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>{if(!drop.contains(e.target))e.preventDefault();});
  document.querySelectorAll('[data-hero-level]').forEach(b=>b.onclick=()=>{pauseHero();void setHero(b.dataset.heroLevel);});
  $('#hero-rotation').onclick=()=>{heroPaused=!heroPaused;scheduleHero();};
  $('.hero-example').addEventListener('focusin',e=>{if(e.target!==$('#hero-rotation'))pauseHero();});
  $('.hero-example').addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){heroHovered=true;scheduleHero();}});
  $('.hero-example').addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){heroHovered=false;scheduleHero();}});
  $('.hero-photo-stage').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){pauseHero();heroTouch={x:e.clientX,y:e.clientY};}});
  $('.hero-photo-stage').addEventListener('pointerup',e=>{if(e.pointerType!=='touch'||!heroTouch)return;const dx=e.clientX-heroTouch.x,dy=e.clientY-heroTouch.y;heroTouch=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.2)moveHero(dx<0?1:-1);});
  $('.hero-photo-stage').addEventListener('pointercancel',()=>{heroTouch=null;});
  document.addEventListener('visibilitychange',scheduleHero);
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)pauseHero();});
  document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-type]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGallery(b.dataset.type);});
  $('#gallery').addEventListener('click',e=>{const b=e.target.closest('[data-case]');if(b)openSample(b.dataset.case);});
  const openHero=()=>{pauseHero();const item=heroDisplayed||heroCase();if(item){openSample(item.id);if(levels.includes(heroLevel))choose(heroLevel);}else toast(t('hero.loading'));};
  $('#try-sample').onclick=openHero;$('#open-hero-case').onclick=openHero;
  $('.brand').addEventListener('click',e=>{e.preventDefault();showHome();});$('#back-home').onclick=()=>showHome();
  document.querySelectorAll('[data-home-anchor]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showHome(a.dataset.homeAnchor);}));
  $('#resume-task').onclick=()=>{if(current?.variants){renderResults();showWorkspace();}else if(session)void resumeJob();};
  $('#close-checkout').onclick=()=>$('#checkout-dialog').close();$('#download-button').onclick=downloadBundle;
  $('#checkout-dialog').addEventListener('close',()=>{checkoutSelection=null;});
  $('#checkout-dialog').addEventListener('click',e=>{if(e.target===$('#checkout-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;refreshSticky();scheduleHero();}).observe($('.hero'));
  window.addEventListener('pagehide',event=>{clearTimeout(heroTimer);if(!event.persisted)clearUrls();});
  window.addEventListener('pageshow',event=>{scheduleHero();if(event.persisted&&current?.kind==='upload'&&session)void resumeJob();});
  async function initialize(){
    document.querySelectorAll('[data-upload]').forEach(b=>b.disabled=!backendReady);
    if(!staticPreview){try{
      config=await(await request('/api/config',{},null)).json();
      if(!['demo','real'].includes(config.mode))throw new Error('照片服务配置不正确。');
      backendReady=true;document.querySelectorAll('[data-upload]').forEach(b=>b.disabled=false);
    }catch(e){$('.demo-notice').textContent='照片服务暂时未连接，可先用示例查看效果。';toast(e.message);}}
    try{
      const response=await fetch('journey-cases.json');if(!response.ok)throw new Error('案例暂时没有加载成功，请刷新重试。');
      const data=await response.json();cases=data.cases;
      for(const c of cases)for(const image of Object.values(c.images))image.url=assetUrl(image.url);
      $('#hero-rotation').disabled=!heroCase();
      void setHero(heroLevel);renderGallery();
      const previous=stored(sampleKey);
      const returnOrder=new URLSearchParams(location.search).get('order_id');
      if(returnOrder&&session&&pendingOrder?.id===returnOrder&&backendReady)void resumeJob();
      else if(location.hash==='#workspace'){
        if(previous&&cases.some(c=>c.id===previous.id)){openSample(previous.id);if(levels.includes(previous.selected))choose(previous.selected);}
        else if(session&&backendReady)void resumeJob();else showHome();
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
    if(backendReady&&config.mode==='real'){
      $('.purchase-note span:nth-child(2)').textContent='免费预览';
      $('.question-price strong').textContent='先看效果，再选购';
      $('.question-price>span').textContent=config.payments?.enabled?`${priceFor()} / 三张整套`:'当前只开放预览';
      $('.site-footer>div>span').textContent=config.payments?.enabled?(config.payments.mode==='test'?'Stripe 测试版':'先预览，再购买'):'预览版';
      $('.demo-notice').textContent='上传照片将交由 AI 服务编辑，服务副本最长保留 24 小时。'+(config.payments?.enabled?(config.payments.mode==='test'?'付款当前为 Stripe 测试模式，不会实际扣款。':'先看效果，再通过 Stripe 一次购买三个版本。'):'付款服务尚未配置，当前可查看预览。');
      const paragraphs=document.querySelectorAll('.question-list details p');
      paragraphs[0].textContent=config.payments?.enabled?'先查看三个版本，喜欢再付款。一次付款包含三张原尺寸成片，具体整套价格在付款前展示。三个版本未全部完成时不会开放付款。当前支付模式：'+(config.payments.mode==='test'?'测试，不会真实扣款。':'Stripe 正式付款。'):'上传后可查看 AI 编辑预览，付款尚未配置，暂不开放付费下载。';
      paragraphs[1].textContent='照片不会加入照片墙。上传会发送给配置的 AI 服务；本服务副本最长保留 24 小时，可删除。AI 服务方的记录按其规则处理。';
      paragraphs[3].textContent='上传后会分析照片、分别编辑三档结果并复核。三个版本全部完成后可一次购买整套，后台核验付款后提供三张同版成片的打包下载。照片细节请本人复核。';
    }
  }
  function refreshLocale(){
    document.documentElement.lang=i18n.locale;document.documentElement.dir=i18n.direction;
    applyTranslations();
    for(const level of ['original',...levels])names[level]=t(`levels.${level}`);
    for(const level of levels)summaries[level]=t(`levels.${level}Summary`);
    if(cases.length){renderGallery($('[data-type][aria-pressed="true"]')?.dataset.type||'all');void setHero(heroLevel,{automatic:true});}
    if(current?.variants&&!$('#workspace').hidden){for(const variant of current.variants)variant.name=names[variant.id]||variant.name;renderResults();}
    window.dispatchEvent(new CustomEvent('light-isle:localechange',{detail:{locale:i18n.locale,direction:i18n.direction}}));
  }
  window.LightIsleI18n=i18n;i18n.subscribe(refreshLocale);refreshLocale();
  void initialize();
})();
