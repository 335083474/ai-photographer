// Selected from test-run.json; full outputs and reviews remain in the test lab.
const cases = [
  {
    "id": "01_backlit_portrait",
    "category": "pose",
    "name": "动作",
    "title": "逆光里，也能看见好状态",
    "description": "提亮人物，尝试更松弛的站姿",
    "level": "creative",
    "levelName": "创意重拍",
    "compare": "toggle",
    "before": "test-assets/20261007-v1/01_backlit_portrait/original-4a2e812a86ba.jpg",
    "after": "test-assets/20261007-v1/01_backlit_portrait/creative-5897997da30e.jpg",
    "ratio": "0.75",
    "source": "合成原片 · Imagegen 实际编辑 · 人工编排测试",
    "note": "原地貌的细节仍被改写，此结果适合创作表达而非精确地点记录；人物身份仅为视觉近似判断，需用户确认",
    "verdict": "passed"
  },
  {
    "id": "02_night_group",
    "category": "light",
    "name": "光影",
    "title": "夜晚的合照，每个人都清楚",
    "description": "柔和补光，保留夜晚的氛围",
    "level": "photographer",
    "levelName": "摄影师优化",
    "compare": "slider",
    "before": "test-assets/20261007-v1/02_night_group/original-f103dc9e9706.jpg",
    "after": "test-assets/20261007-v1/02_night_group/photographer-f31b5698324c.jpg",
    "ratio": "1.3333333333333333",
    "source": "合成原片 · Imagegen 实际编辑 · 人工编排测试",
    "note": "与自然档在构图和表达上差异很小，新增选择价值有限；精确身份尚未验证",
    "verdict": "passed"
  },
  {
    "id": "03_product_text",
    "category": "scene",
    "name": "场景",
    "title": "从随手一拍，到简洁棚景",
    "description": "整理背景，让商品成为主角",
    "level": "creative",
    "levelName": "创意重拍",
    "compare": "toggle",
    "before": "test-assets/20261007-v1/03_product_text/original-48b77bf60e0e.jpg",
    "after": "test-assets/20261007-v1/03_product_text/creative-42eec4c4549d.jpg",
    "ratio": "0.9382239382239382",
    "source": "合成原片 · Imagegen 实际编辑 · 人工编排测试",
    "note": "背景与台面为新创作；杯体表面和颜色仅目视近似，不能承诺商品细节逐像素一致",
    "verdict": "passed"
  },
  {
    "id": "04_food_warm_light",
    "category": "color",
    "name": "色彩",
    "title": "把暖黄，调回鲜活的颜色",
    "description": "修正偏色，找回食物的层次",
    "level": "natural",
    "levelName": "自然修好",
    "compare": "slider",
    "before": "test-assets/20261007-v1/04_food_warm_light/original-ad9efdb16de1.jpg",
    "after": "test-assets/20261007-v1/04_food_warm_light/natural-6330c71ff2e1.jpg",
    "ratio": "0.75",
    "source": "合成原片 · Imagegen 实际编辑 · 人工编排测试",
    "note": "细碎芝士与面条属于生成式编辑，未验证逐像素不变",
    "verdict": "passed"
  },
  {
    "id": "05_pet_background",
    "category": "scene",
    "name": "场景",
    "title": "换到窗边，可爱更突出",
    "description": "明亮侧光与更简洁的背景",
    "level": "creative",
    "levelName": "创意重拍",
    "compare": "toggle",
    "before": "test-assets/20261007-v1/05_pet_background/original-7eb95219ba19.jpg",
    "after": "test-assets/20261007-v1/05_pet_background/creative-40aabc73e2d5.jpg",
    "ratio": "0.75",
    "source": "合成原片 · Imagegen 实际编辑 · 人工编排测试",
    "note": "背景被重新创作，花纹的精确一致性仍需原主人确认",
    "verdict": "passed"
  },
  {
    "id": "06_architecture_tilt",
    "category": "composition",
    "name": "构图",
    "title": "靠近主体，建筑更有分量",
    "description": "收紧取景，突出立面与线条",
    "level": "photographer",
    "levelName": "摄影师优化",
    "compare": "toggle",
    "before": "test-assets/20261007-v1/06_architecture_tilt/original-e511b8165268.jpg",
    "after": "test-assets/20261007-v1/06_architecture_tilt/photographer-9d1bdb82aa90.jpg",
    "ratio": "1.3333333333333333",
    "source": "合成原片 · Imagegen 实际编辑 · 人工编排测试",
    "note": "天空云层重新生成，建筑装饰和窗框小细节未获精确一致性验证；屋檐斜线包含透视关系，不能仅因未完全水平就要求强行拉平",
    "verdict": "uncertain"
  }
];
const gallery = document.querySelector('#gallery');
const fileInput = document.querySelector('#file-input');
const preview = document.querySelector('#preview-dialog');
const content = document.querySelector('#preview-content');
const checkout = document.querySelector('#checkout-dialog');
let taskId = 0, lastFocused = null;
let toastTimer;
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),4200); }
function openDialog(dialog) { lastFocused=document.activeElement; if(!dialog.open)dialog.showModal(); document.body.style.overflow='hidden'; }
function closeDialog(dialog) { dialog.close(); }
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelectorAll('.close-dialog').forEach(btn=>btn.addEventListener('click',()=>closeDialog(dialog)));
  dialog.addEventListener('click',event=>{ if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);} });
  dialog.addEventListener('close',()=>{ if(!document.querySelector('dialog[open]')){document.body.style.overflow='';if(lastFocused?.isConnected)lastFocused.focus();} });
});
function bindComparisons(root=document) {
  root.querySelectorAll('[data-comparison]').forEach(el=>{ if(el.dataset.bound)return;el.dataset.bound='true';const range=el.querySelector('.compare-range');const update=()=>el.style.setProperty('--split',range.value+'%');range.addEventListener('input',update);update(); });
  root.querySelectorAll('[data-image-toggle]').forEach(el=>{
    if(el.dataset.bound)return;el.dataset.bound='true';
    el.querySelectorAll('[data-image-version]').forEach(button=>button.addEventListener('click',()=>{
      const original=button.dataset.imageVersion==='original';
      const img=el.querySelector('[data-result-image]');
      img.src=original?el.dataset.before:el.dataset.after;
      img.alt=original?el.dataset.originalAlt:el.dataset.resultAlt;
      el.querySelector('[data-result-label]').textContent=original?'原片':el.dataset.level;
      el.querySelectorAll('[data-image-version]').forEach(control=>{const active=control===button;control.classList.toggle('active',active);control.setAttribute('aria-pressed',String(active));});
    }));
  });
}
function comparisonMarkup(item) {
  if(item.before&&item.after){
    if(item.compare==='toggle')return `<div class="comparison is-ai-result is-whole-switch" data-image-toggle data-before="${item.before}" data-after="${item.after}" data-level="${item.levelName}" data-original-alt="${item.title} · 合成原片" data-result-alt="${item.title} · ${item.levelName}实际结果" style="--photo-ratio:${item.ratio}"><img class="after-image" data-result-image src="${item.after}" alt="${item.title} · ${item.levelName}实际结果" loading="lazy"><span class="photo-label label-after" data-result-label>${item.levelName}</span><div class="result-switch" role="group" aria-label="${item.title}版本"><button data-image-version="original" aria-pressed="false">原片</button><button data-image-version="result" class="active" aria-pressed="true">${item.levelName}</button></div></div>`;
    return `<div class="comparison is-ai-result" data-comparison style="--photo-ratio:${item.ratio}"><img class="after-image" src="${item.after}" alt="${item.title} · ${item.levelName}实际结果" loading="lazy"><div class="before-layer"><img class="original-frame" src="${item.before}" alt="${item.title} · 合成原片" loading="lazy"></div><span class="photo-label label-before">原片</span><span class="photo-label label-after">${item.levelName}</span><div class="slider-line"><span class="slider-knob" aria-hidden="true">‹ &nbsp; ›</span></div><input class="compare-range" type="range" min="0" max="100" value="50" aria-label="拖动查看${item.title}前后对比"></div>`;
  }
  return "";
}

function renderGallery(filter='all') {
  const visible=filter==='all'?cases:cases.filter(item=>item.category===filter);
  gallery.innerHTML=visible.map(item=>`<article class="case-card">${comparisonMarkup(item)}<div class="case-info"><div><span class="case-type">${item.name} / ${item.levelName}</span><h3>${item.title}</h3><p>${item.description}</p><small class="case-provenance">合成原片 · 实际 AI 编辑${item.verdict==='uncertain'?' · 需复核':''}</small></div><button class="case-expand" data-case="${item.id}" aria-label="放大：${item.title}">↗</button></div></article>`).join('');
  gallery.dataset.filter=filter;
  gallery.style.setProperty('--filtered-columns',Math.min(visible.length,2));
  bindComparisons(gallery);
}
document.querySelectorAll('button[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('button[data-filter]').forEach(btn=>{const active=btn===button;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));}); renderGallery(button.dataset.filter);
}));
gallery.addEventListener('click',event=>{const button=event.target.closest('[data-case]');if(!button)return;const item=cases.find(c=>c.id===button.dataset.case);document.querySelector('#preview-title').textContent=item.title;document.querySelector('#preview-eyebrow').textContent=`${item.name} / PHOTOGRAPHY STUDY`;content.innerHTML=comparisonMarkup(item)+`<div class="preview-actions"><p>${item.source}<br>${item.note}<br><a class="case-lab-link" href="test-lab.html?case=${item.id}">查看完整三档与问题记录 ↗</a></p><button class="button" data-upload>试试我的照片 <span>↗</span></button></div>`;content.querySelector('.comparison').classList.add('preview-comparison');bindComparisons(content);openDialog(preview);});
document.addEventListener('click',event=>{if(event.target.closest('[data-upload]'))fileInput.click();});
fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];fileInput.value='';if(file)window.photoWorkflow.process(file);});
const drop=document.querySelector('#upload-drop');
['dragenter','dragover'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('drag-over');}));
['dragleave','drop'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('drag-over');}));
drop.addEventListener('drop',event=>{const file=event.dataTransfer.files?.[0];if(file)window.photoWorkflow.process(file);});
window.addEventListener('dragover',event=>event.preventDefault());
window.addEventListener('drop',event=>{if(!drop.contains(event.target))event.preventDefault();});

window.photoUI={toast,openDialog,bindComparisons,preview,content,checkout};
renderGallery();bindComparisons();
