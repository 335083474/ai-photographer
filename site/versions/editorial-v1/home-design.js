(() => {
  const photo = document.querySelector('#featured-photo');
  const label = document.querySelector('#featured-label');
  const versions = {
    original: {src:'test-assets/20261007-v1/01_backlit_portrait/original-4a2e812a86ba.jpg', label:'原片', alt:'合成原片：脸部偏暗的湖边逆光人像'},
    creative: {src:'test-assets/20261007-v1/01_backlit_portrait/creative-5897997da30e.jpg', label:'创意重拍', alt:'创意重拍测试：湖边旅行人像，暖色侧光与放松站姿'}
  };
  document.querySelectorAll('[data-featured]').forEach(button => {
    button.addEventListener('click', () => {
      const version = versions[button.dataset.featured];
      photo.src = version.src;
      photo.alt = version.alt;
      label.textContent = version.label;
      document.querySelectorAll('[data-featured]').forEach(control => {
        const active = control === button;
        control.classList.toggle('active', active);
        control.setAttribute('aria-pressed', String(active));
      });
    });
  });
  const mobileUpload = document.querySelector('.mobile-upload');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      mobileUpload.classList.toggle('is-away', entry.isIntersecting);
    });
    observer.observe(document.querySelector('.editorial-hero'));
  }
})();
