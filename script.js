document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('videoPlayer');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const progress = document.getElementById('progress');
  const seekBar = document.getElementById('seekBar');
  const currentTimeDisplay = document.getElementById('currentTime');
  const durationDisplay = document.getElementById('duration');
  const volumeBtn = document.getElementById('volumeBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // Funciones auxiliares
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Reproducir/Pausar
  playPauseBtn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      playPauseBtn.classList.add('playing');
    } else {
      video.pause();
      playPauseBtn.classList.remove('playing');
    }
  });

  // Actualizar barra de progreso
  video.addEventListener('timeupdate', () => {
    const percentage = (video.currentTime / video.duration) * 100;
    progress.style.width = `${percentage}%`;
    seekBar.value = percentage;
    currentTimeDisplay.textContent = formatTime(video.currentTime);
  });

  // Mostrar duración total
  video.addEventListener('loadedmetadata', () => {
    durationDisplay.textContent = formatTime(video.duration);
    seekBar.max = 100;
  });

  // Control de progreso
  seekBar.addEventListener('input', () => {
    const time = (seekBar.value / 100) * video.duration;
    video.currentTime = time;
  });

  // Control de volumen
  volumeSlider.addEventListener('input', () => {
    video.volume = volumeSlider.value;
    if (video.volume === 0) {
      volumeBtn.querySelector('.volume-icon').innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else {
      volumeBtn.querySelector('.volume-icon').innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
  });

  // Silenciar/Activar sonido
  volumeBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (video.muted) {
      volumeSlider.value = 0;
      volumeBtn.querySelector('.volume-icon').innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else {
      volumeSlider.value = 1;
      video.volume = 1;
      volumeBtn.querySelector('.volume-icon').innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
  });

  // Pantalla completa
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  });

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Space':
        playPauseBtn.click();
        e.preventDefault();
        break;
      case 'ArrowLeft':
        video.currentTime -= 5;
        break;
      case 'ArrowRight':
        video.currentTime += 5;
        break;
      case 'ArrowUp':
        video.volume = Math.min(1, video.volume + 0.1);
        volumeSlider.value = video.volume;
        break;
      case 'ArrowDown':
        video.volume = Math.max(0, video.volume - 0.1);
        volumeSlider.value = video.volume;
        break;
    }
  });
});