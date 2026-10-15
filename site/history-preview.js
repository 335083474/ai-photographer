(() => {
  const home=new URL('../../',location.href);
  const notice=document.createElement('div');notice.style.cssText='padding:10px 20px;text-align:center;background:#e4ebc8;color:#3c5631;font:12px/1.8 sans-serif';
  const link=document.createElement('a');link.href=home.href;link.textContent='回新版体验上传 ↗';link.style.textDecoration='underline';
  notice.append('上一版布局对照 · ',link);document.body.prepend(notice);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-upload]')){event.preventDefault();event.stopImmediatePropagation();location.assign(home.href);}
    if(event.target.closest('#demo-workflow')){event.preventDefault();event.stopImmediatePropagation();sessionStorage.setItem('light-isle-journey-sample',JSON.stringify({id:'01_backlit_portrait',selected:'creative'}));home.hash='workspace';location.assign(home.href);}
  },true);
  document.addEventListener('drop',event=>{if(event.dataTransfer?.files.length){event.preventDefault();event.stopImmediatePropagation();location.assign(home.href);}},true);
})();
