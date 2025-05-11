// script.js
// Fetch, sort by height, and fade-in images as they load without waiting for all to finish

document.addEventListener('DOMContentLoaded', () => {
  const owner = 'bjornelvar';
  const repo = 'pics';
  const folder = 'images';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folder}`;
  const gallery = document.getElementById('gallery');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  let currentFilter = 'all';

  // Inject fade-in styles
  const style = document.createElement('style');
  style.innerHTML = `
    .gallery img {
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    .gallery img.loaded {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  async function fetchImageUrls() {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('API failed');
      const files = await res.json();
      return files
        .filter(f => f.type === 'file' && /\.(jpe?g|png|gif)$/i.test(f.name))
        .map(f => f.download_url);
    } catch {
      // fallback to local directory listing
      const res = await fetch(`./${folder}/`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return Array.from(doc.querySelectorAll('a'))
        .map(a => a.getAttribute('href'))
        .filter(n => /\.(jpe?g|png|gif)$/i.test(n))
        .map(n => `./${folder}/${n}`);
    }
  }

  function insertImage({ src, orientation }) {
    if (currentFilter !== 'all' && orientation !== currentFilter) return;
    const imgEl = document.createElement('img');
    imgEl.src = src;
    imgEl.onload = () => {
      imgEl.classList.add('loaded');
      sortGallery();
    };
    imgEl.onclick = () => {
      lightboxImg.src = src;
      lightbox.style.display = 'flex';
    };
    gallery.appendChild(imgEl);
  }

  function sortGallery() {
    const imgs = Array.from(gallery.children);
    imgs.sort((a, b) => b.naturalHeight - a.naturalHeight);
    imgs.forEach(img => gallery.appendChild(img));
  }

  async function loadImages() {
    const urls = await fetchImageUrls();
    urls.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const orientation = img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape';
        insertImage({ src, orientation });
      };
    });
  }

  // Filter click handlers
  document.querySelectorAll('.filters a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector('.filters a.active').classList.remove('active');
      link.classList.add('active');
      currentFilter = link.dataset.filter;
      gallery.innerHTML = '';
      loadImages();
    });
  });

  // Close lightbox on click
  lightbox.addEventListener('click', () => (lightbox.style.display = 'none'));

  // Initial load
  loadImages();
});
