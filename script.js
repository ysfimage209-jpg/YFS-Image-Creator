// ===== DOM REFERENCES =====
const generateBtn = document.getElementById('generateBtn');
const promptInput = document.getElementById('promptInput');
const styleSelect = document.getElementById('styleSelect');
const loadingArea = document.getElementById('loadingArea');
const loadingProgress = document.querySelector('.loading-progress');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const galleryGrid = document.getElementById('recentGallery');

// ===== STATE =====
let currentImageUrl = null;
let isGenerating = false;

// ===== LOCAL STORAGE =====
const STORAGE_KEY = 'yfs_gallery';

function loadGalleryFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGalleryToStorage(gallery) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
  } catch (e) {
    console.warn('Could not save gallery to localStorage', e);
  }
}

// ===== RENDER GALLERY =====
function renderGallery(images) {
  if (!galleryGrid) return;

  // Keep only the 6 most recent
  const recent = images.slice(-6).reverse();

  // Clear existing placeholder cards
  galleryGrid.innerHTML = '';

  if (recent.length === 0) {
    // Show empty state with placeholders
    for (let i = 0; i < 6; i++) {
      const card = document.createElement('figure');
      card.className = 'gallery-card';
      card.innerHTML = `
        <img src="#" alt="placeholder" loading="lazy" style="background: linear-gradient(135deg, #1a1040, #0d0b2b);">
        <figcaption>✨ your creation</figcaption>
      `;
      galleryGrid.appendChild(card);
    }
    return;
  }

  recent.forEach((item, index) => {
    const card = document.createElement('figure');
    card.className = 'gallery-card';
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.prompt || `Creation ${index + 1}`;
    img.loading = 'lazy';
    img.onerror = () => {
      img.src = '#';
      img.style.background = 'linear-gradient(135deg, #1a1040, #0d0b2b)';
    };
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = item.prompt || 'Untitled';
    card.appendChild(img);
    card.appendChild(figcaption);
    galleryGrid.appendChild(card);
  });
}

// ===== ADD TO GALLERY =====
function addToGallery(imageUrl, prompt) {
  if (!imageUrl) return;
  const gallery = loadGalleryFromStorage();
  gallery.push({
    url: imageUrl,
    prompt: prompt || 'AI generated',
    timestamp: Date.now()
  });
  // Keep only last 50 to avoid storage issues
  if (gallery.length > 50) {
    gallery.splice(0, gallery.length - 50);
  }
  saveGalleryToStorage(gallery);
  renderGallery(gallery);
}

// ===== SIMULATE PROGRESS =====
function simulateProgress(callback) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 12) + 3;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      if (loadingProgress) loadingProgress.textContent = '100%';
      if (callback) callback();
      return;
    }
    if (loadingProgress) loadingProgress.textContent = progress + '%';
  }, 180);
  return interval;
}

// ===== GENERATE IMAGE =====
async function generateImage() {
  if (isGenerating) return;
  const prompt = promptInput.value.trim();
  if (!prompt) {
    alert('Please enter a prompt to generate an image.');
    promptInput.focus();
    return;
  }

  const style = styleSelect.value;

  // Show loading
  isGenerating = true;
  generateBtn.disabled = true;
  generateBtn.innerHTML = `<span class="btn-text">Generating…</span><span class="btn-icon">⏳</span>`;
  loadingArea.style.display = 'flex';
  if (loadingProgress) loadingProgress.textContent = '0%';
  imagePreview.style.display = 'none';

  let progressInterval = null;

  try {
    // Start progress simulation
    progressInterval = simulateProgress();

    // --- API CALL using fetch (free API from pollinations.ai) ---
    // Using a generous timeout and a real image generation endpoint
    const encodedPrompt = encodeURIComponent(`${prompt}, style: ${style}, high quality, detailed, 4k`);
    const apiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true`;

    // Fetch the image as a blob to handle errors properly
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    // Get the image blob
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    // Stop progress simulation and set to 100%
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    if (loadingProgress) loadingProgress.textContent = '100%';

    // Small delay to show 100% before hiding loading
    await new Promise(resolve => setTimeout(resolve, 300));

    // Display image
    currentImageUrl = imageUrl;
    previewImg.src = imageUrl;
    previewImg.alt = prompt;
    imagePreview.style.display = 'block';

    // Add to gallery
    addToGallery(imageUrl, prompt);

    // Hide loading
    loadingArea.style.display = 'none';

  } catch (error) {
    console.error('Generation error:', error);

    // Clear progress
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    // Show error in loading area
    loadingArea.style.display = 'flex';
    if (loadingProgress) loadingProgress.textContent = '⚠️';
    const loadingText = loadingArea.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = 'Error: ' + (error.message || 'Failed to generate image. Please try again.');
      loadingText.style.color = '#f87171';
    }

    // Reset after 3 seconds
    setTimeout(() => {
      loadingArea.style.display = 'none';
      if (loadingText) {
        loadingText.textContent = 'YFS is creating…';
        loadingText.style.color = '';
      }
      if (loadingProgress) loadingProgress.textContent = '0%';
    }, 3000);

  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    generateBtn.innerHTML = `<span class="btn-text">Generate</span><span class="btn-icon">→</span>`;
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  }
}

// ===== DOWNLOAD IMAGE =====
function downloadImage() {
  if (!currentImageUrl) {
    alert('Please generate an image first.');
    return;
  }
  const link = document.createElement('a');
  link.href = currentImageUrl;
  const prompt = promptInput.value.trim() || 'yfs-ai-creation';
  link.download = `yfs-ai-${prompt.slice(0, 30).replace(/\s+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===== SHARE IMAGE =====
async function shareImage() {
  if (!currentImageUrl) {
    alert('Please generate an image first.');
    return;
  }

  try {
    // Fetch the image as a blob for sharing
    const response = await fetch(currentImageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'yfs-ai-creation.png', { type: 'image/png' });

    if (navigator.share) {
      await navigator.share({
        title: 'YFS AI Create',
        text: `Check out my AI creation: "${promptInput.value.trim() || 'YFS AI image'}"`,
        files: [file]
      });
    } else {
      // Fallback: copy image URL to clipboard
      await navigator.clipboard.writeText(currentImageUrl);
      alert('Image URL copied to clipboard! You can paste it anywhere to share.');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.warn('Share failed:', error);
      // Fallback: copy URL
      try {
        await navigator.clipboard.writeText(currentImageUrl);
        alert('Image URL copied to clipboard!');
      } catch {
        alert('Could not share. You can download the image and share it manually.');
      }
    }
  }
}

// ===== COPY IMAGE (preview action) =====
async function copyImage() {
  if (!currentImageUrl) {
    alert('Please generate an image first.');
    return;
  }
  try {
    await navigator.clipboard.writeText(currentImageUrl);
    alert('Image URL copied to clipboard!');
  } catch {
    alert('Could not copy. You can download the image instead.');
  }
}

// ===== UPLOAD IMAGE =====
function handleUpload() {
  fileInput.click();
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    fileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const imageUrl = e.target.result;
    currentImageUrl = imageUrl;
    previewImg.src = imageUrl;
    previewImg.alt = 'Uploaded image';
    imagePreview.style.display = 'block';

    // Add to gallery with upload label
    const prompt = promptInput.value.trim() || 'Uploaded image';
    addToGallery(imageUrl, `📤 ${prompt}`);

    // Hide loading if visible
    loadingArea.style.display = 'none';
  };
  reader.onerror = function() {
    alert('Failed to read the image file.');
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
}

// ===== KEYBOARD SHORTCUT =====
function handleKeyDown(event) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    generateImage();
  }
}

// ===== PREVIEW IMAGE ON CLICK (fullscreen) =====
function previewFullscreen() {
  if (!currentImageUrl) return;
  const img = previewImg;
  if (img.requestFullscreen) {
    img.requestFullscreen().catch(() => {});
  } else if (img.webkitRequestFullscreen) {
    img.webkitRequestFullscreen();
  }
}

// ===== EVENT LISTENERS =====
generateBtn.addEventListener('click', generateImage);

uploadBtn.addEventListener('click', handleUpload);
fileInput.addEventListener('change', handleFileSelected);

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.shiftKey) {
    // Allow shift+enter for newline, otherwise prevent
  }
});

// Preview actions
const previewActions = document.querySelector('.preview-actions');
if (previewActions) {
  const buttons = previewActions.querySelectorAll('.btn-icon-only');
  if (buttons.length >= 3) {
    // Download button (first)
    buttons[0].addEventListener('click', downloadImage);
    // Copy button (second)
    buttons[1].addEventListener('click', copyImage);
    // Share button (third)
    buttons[2].addEventListener('click', shareImage);
  }
}

// Click on preview image to fullscreen
if (previewImg) {
  previewImg.addEventListener('click', previewFullscreen);
}

// Keyboard shortcut: Cmd/Ctrl + Enter
document.addEventListener('keydown', handleKeyDown);

// ===== INITIALIZATION =====
function init() {
  // Load gallery from storage
  const gallery = loadGalleryFromStorage();
  renderGallery(gallery);

  // Set default prompt example
  if (!promptInput.value) {
    promptInput.value = 'cyberpunk samurai, neon rain, volumetric fog, cinematic lighting';
  }

  // Show a placeholder image in preview? No, keep hidden.
  imagePreview.style.display = 'none';

  console.log('YFS AI Create initialized.');
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ===== SERVICE WORKER / OFFLINE FALLBACK =====
// Not required, but we keep the app robust.
// ===== EXPOSE FOR DEBUGGING (optional) =====
window.__yfs = {
  generate: generateImage,
  download: downloadImage,
  share: shareImage,
  gallery: loadGalleryFromStorage
};