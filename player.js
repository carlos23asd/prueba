document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('video-player');
  const playlistItems = document.querySelectorAll('.playlist-item');
  const botLog = document.getElementById('botLog');
  const bufferStatus = document.getElementById('bufferStatus');
  const bufferBar = document.getElementById('bufferBar');
  const connectionSpeedEl = document.getElementById('connectionSpeed');
  const bufferHealthEl = document.getElementById('bufferHealth');
  const fullscreenButton = document.getElementById('fullscreenButton');

  let activeHls = null;
  let connectionSpeed = 0;
  let lastBufferUpdateTime = 0;
  let bufferUpdateInterval = null;
  
  // Logout button event handler
  document.getElementById('logoutButton').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = "login.html";
    } else {
      console.error("Error signing out", error);
    }
  });

  // Fullscreen button event handler
  fullscreenButton.addEventListener('click', () => {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) { /* Safari */
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) { /* IE11 */
      video.msRequestFullscreen();
    }
  });

  // Deshabilitar clic derecho
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  // Deshabilitar clic izquierdo en la página
  document.addEventListener('mousedown', function(e) {
    if (e.button === 0 && e.target.tagName !== 'BUTTON' && !e.target.closest('.playlist-item') && e.target.tagName !== 'VIDEO') {
      e.preventDefault();
    }
  });

  function logMessage(message, isSuccess) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${isSuccess ? 'log-success' : 'log-error'}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    botLog.appendChild(entry);
    botLog.scrollTop = botLog.scrollHeight;
  }

  async function checkStream(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'StreamGuard/1.0',
          'Referer': 'about:blank',
          'Origin': null,
        },
        mode: 'cors',
        credentials: 'omit'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Función para medir la velocidad de conexión
  async function measureConnectionSpeed() {
    const testUrl = 'https://www.cloudflare.com/cdn-cgi/trace';
    const samples = 3;
    let totalSpeed = 0;
    
    bufferStatus.style.display = 'block';
    bufferStatus.textContent = 'Midiendo velocidad de conexión...';
    
    for (let i = 0; i < samples; i++) {
      const startTime = performance.now();
      try {
        const response = await fetch(testUrl + '?sample=' + i);
        const text = await response.text();
        const endTime = performance.now();
        const duration = endTime - startTime;
        const contentLength = text.length;
        const speed = (contentLength * 8) / (duration / 1000); // bits per second
        totalSpeed += speed;
      } catch (error) {
        console.error('Error measuring speed:', error);
      }
    }
    
    const averageSpeed = totalSpeed / samples;
    
    // Convert to Mbps for display
    const speedInMbps = (averageSpeed / 1000000).toFixed(2);
    connectionSpeedEl.textContent = `Velocidad: ${speedInMbps} Mbps`;
    
    bufferStatus.style.display = 'none';
    
    return averageSpeed;
  }

  window.checkAllStreams = async function() {
    logMessage('Iniciando verificación de streams...', true);
    
    for (const item of playlistItems) {
      const url = item.getAttribute('data-src');
      const channelName = item.textContent.trim().split(' ')[0];
      const statusIndicator = item.querySelector('.status-indicator');
      
      logMessage(`Verificando canal: ${channelName}...`, true);
      
      try {
        const isWorking = await checkStream(url);
        statusIndicator.className = `status-indicator ${isWorking ? 'status-online' : 'status-offline'}`;
        logMessage(`Canal ${channelName}: ${isWorking ? 'FUNCIONANDO' : 'NO FUNCIONA'}`, isWorking);
      } catch (error) {
        statusIndicator.className = 'status-indicator status-offline';
        logMessage(`Error al verificar ${channelName}: ${error.message}`, false);
      }
    }
    
    logMessage('Verificación completada', true);
  };

  function setupStreamGuard() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      if (args[1] && args[1].headers) {
        args[1].headers = new Headers({
          'User-Agent': 'StreamGuard/1.0',
          'Referer': 'about:blank',
          'Origin': null,
          'SEC-FETCH-SITE': 'same-origin',
          'SEC-FETCH-MODE': 'cors'
        });
      }
      return originalFetch.apply(this, args);
    };
  }

  function cleanupResources() {
    if (window.gc) {
      window.gc();
    }
    performance.clearResourceTimings();
  }

  function updateBufferDisplay() {
    // Don't update too frequently
    const now = Date.now();
    if (now - lastBufferUpdateTime < 500) {
      return;
    }
    lastBufferUpdateTime = now;

    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      const bufferedRatio = (bufferedEnd / duration) * 100;
      
      // Update buffer bar
      bufferBar.style.width = bufferedRatio + '%';
      
      // Calculate buffer health (seconds of video buffered ahead of current time)
      const bufferHealth = bufferedEnd - video.currentTime;
      bufferHealthEl.textContent = `Buffer: ${bufferHealth.toFixed(1)}s`;
      
      // Visual feedback on buffer health
      if (bufferHealth > 50) {  
        bufferBar.style.background = 'linear-gradient(90deg, #00c853, #00c853)'; 
      } else if (bufferHealth > 35) {  
        bufferBar.style.background = 'linear-gradient(90deg, #2196F3, #00c853)'; 
      } else if (bufferHealth > 20) {  
        bufferBar.style.background = 'linear-gradient(90deg, #ffeb3b, #2196F3)'; 
      } else {
        bufferBar.style.background = 'linear-gradient(90deg, #ff5252, #ffeb3b)'; 
      }
    }
  }

  async function loadVideo(src) {
    // Cleanup any existing player
    if (activeHls) {
      activeHls.destroy();
      activeHls = null;
    }
    
    if (bufferUpdateInterval) {
      clearInterval(bufferUpdateInterval);
    }
    
    if (!Hls.isSupported()) {
      video.src = src;
      return;
    }

    setupStreamGuard();
    
    // Measure connection speed
    connectionSpeed = await measureConnectionSpeed();
    
    // Configure HLS based on connection speed
    let hlsConfig = getOptimizedHlsConfig(connectionSpeed);
    
    activeHls = new Hls(hlsConfig);
    bufferStatus.style.display = 'block';
    bufferStatus.textContent = 'Cargando stream...';
    
    activeHls.loadSource(src);
    activeHls.attachMedia(video);
    
    activeHls.on(Hls.Events.MANIFEST_PARSED, function() {
      bufferStatus.textContent = 'Buffering...';
      video.play().catch(e => console.log("Auto-play prevented:", e));
      
      // Setup buffer update interval
      bufferUpdateInterval = setInterval(updateBufferDisplay, 1000);
    });
    
    activeHls.on(Hls.Events.LEVEL_LOADED, function(event, data) {
      bufferStatus.style.display = 'none';
    });
    
    activeHls.on(Hls.Events.ERROR, function(event, data) {
      bufferStatus.textContent = 'Error: ' + data.details;
      
      if (data.fatal) {
        switch(data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            bufferStatus.textContent = 'Error de red. Reintentando...';
            activeHls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            bufferStatus.textContent = 'Error de medio. Recuperando...';
            activeHls.recoverMediaError();
            break;
          default:
            bufferStatus.textContent = 'Error fatal. Reiniciando...';
            destroyAndReloadPlayer(src);
            break;
        }
      }
    });
    
    activeHls.on(Hls.Events.BUFFER_APPENDING, function() {
      updateBufferDisplay();
    });
    
    video.addEventListener('waiting', function() {
      bufferStatus.style.display = 'block';
      bufferStatus.textContent = 'Buffering...';
    });
    
    video.addEventListener('playing', function() {
      bufferStatus.style.display = 'none';
    });
    
    // Clean up resources periodically
    setInterval(cleanupResources, 60000);
    
    video.addEventListener('pause', function() {
      cleanupResources();
    });
  }
  
  function getOptimizedHlsConfig(connectionSpeed) {
    const speedInMbps = connectionSpeed / 1000000;
    console.log(`Connection speed: ${speedInMbps.toFixed(2)} Mbps`);
    
    // Configuración base
    let config = {
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
        progressive: true,
        testBandwidth: true,
        abrEwmaDefaultEstimate: connectionSpeed,
        abrBandWidthFactor: 1.0,
        abrBandWidthUpFactor: 0.85,
        abrMaxWithRealBitrate: true,
        startLevel: -1,
        manifestLoadingTimeOut: 25000,
        manifestLoadingMaxRetry: 6,
        fragLoadingTimeOut: 25000,
        fragLoadingMaxRetry: 8,
        capLevelToPlayerSize: true,
        fragLoadPolicy: {
            default: {
                maxTimeToFirstByteMs: 8000,
                maxLoadTimeMs: 120000,
                timeoutRetry: { maxNumRetry: 4, retryDelayMs: 500, maxRetryDelayMs: 2000 },
                errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 }
            }
        },
        maxFragLookUpTolerance: 0.5,
        maxBufferSize: 200 * 1000 * 1000,
        maxBufferLength: 120,
        maxMaxBufferLength: 180,
        xhrSetup: function(xhr, url) {
            xhr.withCredentials = false;
            xhr.setRequestHeader('X-Stream-Guard', 'enabled');
            xhr.setRequestHeader('Cache-Control', 'no-store');
        }
    };

    // Configuración específica para conexiones muy lentas (menos de 1 Mbps)
    if (speedInMbps < 1) {
        config = {
            ...config,
            // Aumentar dramáticamente el tamaño del buffer para conexiones lentas
            maxBufferLength: 300,            // 5 minutos de buffer
            maxMaxBufferLength: 600,         // 10 minutos máximo
            maxBufferSize: 600 * 1000 * 1000, // 600MB de buffer máximo
            
            // Configuración más agresiva para conexiones lentas
            startLevel: 0,                   // Comenzar con la calidad más baja
            abrBandWidthFactor: 0.5,         // Usar solo 50% del ancho de banda detectado
            abrBandWidthUpFactor: 0.3,       // Más conservador al subir calidad
            
            // Aumentar timeouts y reintentos significativamente
            manifestLoadingTimeOut: 60000,    // 60 segundos
            manifestLoadingMaxRetry: 12,      // Más reintentos
            fragLoadingTimeOut: 60000,        // 60 segundos
            fragLoadingMaxRetry: 15,          // Más reintentos
            
            // Política de carga de fragmentos más agresiva
            fragLoadPolicy: {
                default: {
                    maxTimeToFirstByteMs: 30000,  // Más tiempo para primer byte
                    maxLoadTimeMs: 300000,        // 5 minutos máximo por fragmento
                    timeoutRetry: {
                        maxNumRetry: 10,
                        retryDelayMs: 2000,
                        maxRetryDelayMs: 16000
                    },
                    errorRetry: {
                        maxNumRetry: 12,
                        retryDelayMs: 3000,
                        maxRetryDelayMs: 30000
                    }
                }
            },
            
            // Configuración adicional para optimizar conexiones lentas
            enableSoftwareAES: true,         // Descodificación por software
            enableWebVTT: false,             // Deshabilitar subtítulos
            enableCEA708Captions: false,     // Deshabilitar closed captions
            backBufferLength: 600,           // 10 minutos de buffer hacia atrás
            progressive: true,               // Descarga progresiva
            testBandwidth: false,            // Deshabilitar pruebas de ancho de banda
            
            levelLoadPolicy: {
                default: {
                    maxTimeToFirstByteMs: 30000,
                    maxLoadTimeMs: 240000,
                    timeoutRetry: {
                        maxNumRetry: 8,
                        retryDelayMs: 2000,
                        maxRetryDelayMs: 16000
                    }
                }
            }
        };
        
        // Forzar la precarga agresiva para conexiones lentas
        if (activeHls) {
            activeHls.on(Hls.Events.MANIFEST_PARSED, function() {
                activeHls.startLoad(-1);  // Comenzar a cargar desde el principio
                // Forzar la carga de segmentos adicionales
                setInterval(() => {
                    if (!video.paused) {
                        activeHls.trigger(Hls.Events.BUFFER_EOS);
                    }
                }, 5000);
            });
        }
    } else if (speedInMbps > 15) {
        config = {
            ...config,
            maxBufferSize: 250 * 1000 * 1000,
            maxBufferLength: 160,
            maxMaxBufferLength: 240,
            liveSyncDurationCount: 8,
            liveDurationInfinity: true,
            initialLiveManifestSize: 4,
            abrBandWidthFactor: 1.05,
        };
    } else if (speedInMbps > 10) {
        config = {
            ...config,
            maxBufferSize: 200 * 1000 * 1000,
            maxBufferLength: 120,
            maxMaxBufferLength: 180,
            liveSyncDurationCount: 6,
            liveDurationInfinity: true,
            initialLiveManifestSize: 3,
        };
    } else if (speedInMbps > 5) {
        config = {
            ...config,
            maxBufferSize: 150 * 1000 * 1000,
            maxBufferLength: 90,
            maxMaxBufferLength: 150,
            liveSyncDurationCount: 5,
        };
    } else if (speedInMbps > 2) {
        config = {
            ...config,
            maxBufferSize: 100 * 1000 * 1000,
            maxBufferLength: 60,
            maxMaxBufferLength: 120,
            liveSyncDurationCount: 4,
        };
    } else {
        config = {
            ...config,
            maxBufferSize: 70 * 1000 * 1000,
            maxBufferLength: 40,
            maxMaxBufferLength: 80,
            liveSyncDurationCount: 3,
            startLevel: 0,
        };
    }
    
    return config;
  }

  function destroyAndReloadPlayer(src) {
    if (activeHls) {
      activeHls.destroy();
      activeHls = null;
    }
    
    setTimeout(() => {
      loadVideo(src);
    }, 1000);
  }

  playlistItems.forEach(item => {
    item.addEventListener('click', function() {
      const src = this.getAttribute('data-src');
      
      // Highlight selected item
      playlistItems.forEach(i => i.style.background = '#222');
      this.style.background = '#444';
      
      bufferStatus.style.display = 'block';
      bufferStatus.textContent = 'Cambiando canal...';
      
      loadVideo(src);
    });
  });

  // Cargar el primer video por defecto
  loadVideo(playlistItems[0].getAttribute('data-src'));
  playlistItems[0].style.background = '#444'; 

  // Verificar streams al cargar la página
  checkAllStreams();
  
  // Monitor video playback quality
  video.addEventListener('progress', updateBufferDisplay);
  
  // Buffer agresivo cuando el video está en pausa
  video.addEventListener('pause', function() {
    if (activeHls) {
      activeHls.config.maxBufferLength = Math.min(activeHls.config.maxBufferLength * 1.5, 240);
    }
  });
  
  // Restablecer configuración de buffer al reproducir
  video.addEventListener('play', function() {
    if (activeHls) {
      activeHls.config.maxBufferLength = getOptimizedHlsConfig(connectionSpeed).maxBufferLength;
    }
  });
  
  // Add adaptive buffer management
  video.addEventListener('playing', function() {
    if (activeHls && video.buffered.length > 0) {
      const bufferHealth = video.buffered.end(video.buffered.length - 1) - video.currentTime;
      
      if (bufferHealth > 50 && connectionSpeed > 5000000) { 
        activeHls.nextAutoLevel = -1; 
        activeHls.autoLevelCapping = -1; 
      }
    }
  });
  
  // Adaptive buffer management based on playback state
  let playbackSpeedSample = [];
  let lastPosition = 0;
  let lastPositionTime = 0;
  
  // Monitor actual playback speed
  setInterval(() => {
    if (video.paused || video.seeking || !video.currentTime) return;
    
    const now = performance.now();
    const timeDiff = (now - lastPositionTime) / 1000;
    
    if (timeDiff > 0.5 && lastPosition > 0) { 
      const posDiff = video.currentTime - lastPosition;
      const ratio = posDiff / timeDiff;
      
      playbackSpeedSample.push(ratio);
      
      if (playbackSpeedSample.length > 10) {
        playbackSpeedSample.shift();
      }
      
      if (playbackSpeedSample.length >= 5) {
        const avgSpeed = playbackSpeedSample.reduce((a, b) => a + b, 0) / playbackSpeedSample.length;
        
        if (avgSpeed < 0.9 && activeHls) {
          console.log("Playback struggling, reducing quality");
          const currentLevel = activeHls.currentLevel;
          if (currentLevel > 0) {
            activeHls.nextLevel = currentLevel - 1;
          }
        }
      }
    }
    
    lastPosition = video.currentTime;
    lastPositionTime = now;
  }, 1000);
  
  // Verificación periódica de buffer insuficiente
  setInterval(() => {
    if (video.paused || !activeHls) return;
    
    if (video.buffered.length > 0) {
      const bufferEnd = video.buffered.end(video.buffered.length - 1);
      const bufferHealth = bufferEnd - video.currentTime;
      
      if (bufferHealth < 15) {
        console.log("Buffer bajo, forzando carga de segmentos");
        activeHls.trigger(Hls.Events.BUFFER_EOS, {});
      }
    }
  }, 5000);
});