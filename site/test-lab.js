(() => {
  const levels=['original','natural','photographer','creative'];
  const names={original:'原片',natural:'自然修好',photographer:'摄影师优化',creative:'创意重拍'};
  const descriptions={original:'合成的普通随手拍，作为对照',natural:'保留原貌，做克制的必要调整',photographer:'明确改善光影、构图和画面层次',creative:'尝试新的取景、氛围或姿态'};
  const verdicts={passed:'目视可选',failed:'未达要求',uncertain:'需人工确认'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let run=null,current=new URLSearchParams(location.search).get('case')||'01_backlit_portrait';
  const content=document.querySelector('#case-content');
  function savedChoice(item){try{return JSON.parse(localStorage.getItem(`light-isle-test-${run.run}-${item.id}`));}catch{return null;}}
  function saveChoice(item,value){try{localStorage.setItem(`light-isle-test-${run.run}-${item.id}`,JSON.stringify({value,originalHash:item.images.original?.sha256,selectedHash:item.images[value]?.sha256,at:new Date().toISOString()}));}catch{}renderCase();}
  function renderCase(){
    const item=run.cases.find(c=>c.id===current)||run.cases[0];current=item.id;
    document.querySelectorAll('[data-case]').forEach(b=>{b.classList.toggle('active',b.dataset.case===current);b.setAttribute('aria-pressed',String(b.dataset.case===current));});
    if(!item.images.original){content.innerHTML=`<div class="empty-case"><h2>${esc(item.title)}</h2><p>此案例正在生成。结果保存后点击“刷新结果”即可查看。</p></div>`;return;}
    const choice=savedChoice(item),chosen=choice?.originalHash===item.images.original.sha256&&(choice.value==='none'||choice.selectedHash===item.images[choice.value]?.sha256)?choice.value:null;
    const analysis=item.analysis,review=item.review;
    content.innerHTML=`<div class="test-heading"><h2>${esc(item.title)}</h2><p>${esc(item.type)} · ${esc(item.reviewer)}<br>原片与编辑均为 AI 生成 · 可点击放大检查</p></div><p class="test-purpose"><strong>测试意图：</strong>${esc(item.purpose)}。实际观察以图片及下方分析为准。</p>
      <div class="test-images">${levels.map((level,i)=>{const image=item.images[level],verdict=review?.variants?.[level]?.verdict;return `<article class="test-image-card ${chosen===level?'chosen':''}"><div class="test-photo">${image?`<button data-zoom="${level}" aria-label="放大${names[level]}"><img src="${image.url}" alt="${esc(item.title)} · ${names[level]}" loading="lazy"></button>`:'<span class="missing">正在准备此版本</span>'}<span class="test-index">${i===0?'对照':`0${i}`}</span></div><div class="test-caption"><h3>${names[level]}${verdict?`<span class="review-badge ${esc(verdict)}">${verdicts[verdict]||'待复核'}</span>`:''}</h3><p>${descriptions[level]}</p><button class="test-select" data-pick="${level}" ${image?'':'disabled'}>${chosen===level?'✓ 已选择':'我更喜欢这张'}</button></div></article>`;}).join('')}</div>
      <div class="choice-bar"><span>${chosen?`你的选择：${chosen==='none'?'都不满意':names[chosen]}`:'先比较效果，再留下你的选择。'}</span><div><button class="text-button" data-pick="none">都不满意</button><button class="text-button" id="clear-choice">清除选择</button></div></div>
      <div class="lab-analysis"><section><h3>实际分析 · 改什么</h3>${analysis?`<p>${esc(analysis.intent)}</p><ul>${(analysis.issues||[]).map(i=>`<li>${esc(i.evidence)}<small>处理：${esc(i.action)}</small></li>`).join('')||'<li>没有明确需要修正的问题</li>'}</ul>`:'<p>分析记录正在准备。</p>'}</section><section><h3>保留什么</h3><ul>${(analysis?.preserve||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>${(analysis?.uncertainties||[]).map(s=>`<small>不确定：${esc(s)}</small>`).join('')}</section><section><h3>下次怎么拍</h3>${(analysis?.tips||[]).map(t=>`<p>${esc(t.advice)}<small>${esc(t.reason)}</small></p>`).join('')||'<p>建议正在准备。</p>'}</section></div>
      ${review?`<div class="lab-reviews">${['natural','photographer','creative'].map(l=>{const r=review.variants?.[l];return `<section class="review-item"><h3>${names[l]} · ${verdicts[r?.verdict]||'待复核'}</h3>${(r?.improvements||[]).map(s=>`<p>改善：${esc(s)}</p>`).join('')}${(r?.preservation||[]).map(s=>`<p>保留：${esc(s)}</p>`).join('')}${(r?.issues||[]).map(s=>`<p class="review-issue">问题：${esc(s)}</p>`).join('')}<p>${esc(r?.rationale)}</p></section>`;}).join('')}</div><p class="test-purpose" style="margin-top:16px">${esc(review.summary)}${review.recommended&&review.recommended!=='none'?` · 模型评审建议先看：${names[review.recommended]}`:''}</p>`:''}
      ${item.agentReview?`<details class="lab-details"><summary>查看 Luna 初评（与复核分别保留）</summary><p>${esc(item.agentReview.summary)}</p>${['natural','photographer','creative'].map(l=>`<p>${names[l]}：${verdicts[item.agentReview.variants?.[l]?.verdict]||'未评级'}。${esc(item.agentReview.variants?.[l]?.rationale)}</p>`).join('')}</details>`:''}
      <details class="lab-details"><summary>查看三档实际编辑提示词</summary>${['natural','photographer','creative'].map(l=>`<h3>${names[l]}</h3><pre>${esc(item.prompts[l]||'等待记录')}</pre>`).join('')}</details><details class="lab-details"><summary>查看合成原片的生成要求与测试边界</summary><pre>${esc(item.originalPrompt||'等待记录')}</pre><p>${esc(run.limitations)}</p></details>`;
    content.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>saveChoice(item,b.dataset.pick));
    content.querySelector('#clear-choice').onclick=()=>{try{localStorage.removeItem(`light-isle-test-${run.run}-${item.id}`);}catch{}renderCase();};
    content.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{const level=b.dataset.zoom;document.querySelector('#zoom-image').src=item.images[level].url;document.querySelector('#zoom-image').alt=`${item.title} · ${names[level]}`;document.querySelector('#zoom-caption').textContent=`${item.title} · ${names[level]} · 点击右上角关闭`;document.querySelector('#lab-zoom').showModal();});
  }
  async function load(){
    try{const response=await fetch('test-run.json',{cache:'no-store'});if(!response.ok)throw new Error('测试记录尚未准备好');run=await response.json();const originals=run.cases.filter(c=>c.images.original).length,edits=run.cases.reduce((n,c)=>n+levels.slice(1).filter(l=>c.images[l]).length,0);document.querySelector('#run-status').textContent=`已生成 ${originals}/6 张原片 · 已完成 ${edits}/18 个编辑版本`;
      document.querySelector('#case-nav').innerHTML=run.cases.map((c,i)=>`<button data-case="${c.id}" aria-pressed="false">0${i+1} ${esc(c.title)} <small>${levels.slice(1).filter(l=>c.images[l]).length}/3</small></button>`).join('');document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{current=b.dataset.case;renderCase();});renderCase();
    }catch(error){document.querySelector('#run-status').textContent=error.message;}
  }
  document.querySelector('#refresh-run').onclick=load;document.querySelector('#close-zoom').onclick=()=>document.querySelector('#lab-zoom').close();void load();
})();
