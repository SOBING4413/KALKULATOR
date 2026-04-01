// ===== Mobile Detection =====
var isMobile = (function() {
    var check = false;
    if (window.matchMedia('(max-width: 768px)').matches) check = true;
    if ('ontouchstart' in window && window.innerWidth <= 768) check = true;
    if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)) check = true;
    return check;
})();

// ===== Info Widget =====
class InfoWidget {
    constructor() {
        this.timeEl = document.getElementById('widgetTime');
        this.dateEl = document.getElementById('widgetDate');
        this.tzBadge = document.getElementById('tzBadge');
        this.locationText = document.getElementById('locationText');
        this.weatherTemp = document.getElementById('weatherTemp');
        this.weatherDesc = document.getElementById('weatherDesc');
        this.weatherEmoji = document.getElementById('weatherEmoji');
        this.lat = null;
        this.lon = null;
        this.init();
    }

    init() {
        this.startClock();
        this.getLocation();
    }

    startClock() {
        var self = this;
        function update() {
            var now = new Date();
            self.timeEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            self.dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            self.tzBadge.textContent = self.getTimezoneName();
        }
        update();
        setInterval(update, 1000);
    }

    getTimezoneName() {
        try {
            var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            var offset = new Date().getTimezoneOffset();
            var hours = Math.abs(Math.floor(offset / 60));
            var sign = offset <= 0 ? '+' : '-';
            var idMap = { 'Asia/Jakarta': 'WIB', 'Asia/Pontianak': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Ujung_Pandang': 'WITA', 'Asia/Jayapura': 'WIT' };
            if (idMap[tz]) return idMap[tz];
            var abbrevMap = { 'Asia/Tokyo': 'JST', 'Asia/Seoul': 'KST', 'Asia/Shanghai': 'CST', 'Asia/Singapore': 'SGT', 'Asia/Bangkok': 'ICT', 'Asia/Kolkata': 'IST', 'Europe/London': 'GMT', 'Europe/Paris': 'CET', 'America/New_York': 'EST', 'America/Los_Angeles': 'PST', 'Australia/Sydney': 'AEST' };
            if (abbrevMap[tz]) return abbrevMap[tz];
            return 'UTC' + sign + hours;
        } catch (e) { return 'UTC'; }
    }

    getLocation() {
        var self = this;
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(pos) {
                    self.lat = pos.coords.latitude;
                    self.lon = pos.coords.longitude;
                    self.reverseGeocode(self.lat, self.lon);
                    self.fetchWeather(self.lat, self.lon);
                    setInterval(function() { self.fetchWeather(self.lat, self.lon); }, 300000);
                },
                function() {
                    self.locationText.textContent = 'Lokasi tidak tersedia';
                    self.fetchWeatherByIP();
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
        } else {
            self.locationText.textContent = 'Geolocation tidak didukung';
            self.fetchWeatherByIP();
        }
    }

    reverseGeocode(lat, lon) {
        var self = this;
        fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon + '&zoom=10&accept-language=id')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var addr = data.address || {};
                var city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
                var country = addr.country || '';
                self.locationText.textContent = city && country ? city + ', ' + country : (city || country || 'Lat: ' + lat.toFixed(2));
            })
            .catch(function() { self.locationText.textContent = 'Lat: ' + lat.toFixed(2) + ', Lon: ' + lon.toFixed(2); });
    }

    fetchWeather(lat, lon) {
        var self = this;
        fetch('https://wttr.in/' + lat + ',' + lon + '?format=j1')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.current_condition && data.current_condition[0]) {
                    var c = data.current_condition[0];
                    var tempC = c.temp_C;
                    var desc = c.lang_id && c.lang_id[0] ? c.lang_id[0].value : (c.weatherDesc && c.weatherDesc[0] ? c.weatherDesc[0].value : 'N/A');
                    var code = parseInt(c.weatherCode) || 0;
                    self.weatherTemp.textContent = tempC + '\u00B0C';
                    self.weatherDesc.textContent = desc;
                    self.weatherEmoji.textContent = self.getWeatherEmoji(code, tempC);
                    var t = parseInt(tempC);
                    var grad = t <= 10 ? 'linear-gradient(135deg, #60a5fa, #93c5fd)' : t <= 20 ? 'linear-gradient(135deg, #34d399, #6ee7b7)' : t <= 30 ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'linear-gradient(135deg, #fb923c, #f87171)';
                    self.weatherTemp.style.background = grad;
                    self.weatherTemp.style.webkitBackgroundClip = 'text';
                    self.weatherTemp.style.webkitTextFillColor = 'transparent';
                    self.weatherTemp.style.backgroundClip = 'text';
                }
            })
            .catch(function() { self.weatherTemp.textContent = '--\u00B0C'; self.weatherDesc.textContent = 'Gagal memuat'; });
    }

    fetchWeatherByIP() {
        var self = this;
        fetch('https://ipapi.co/json/')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.latitude && data.longitude) {
                    self.lat = data.latitude;
                    self.lon = data.longitude;
                    var city = data.city || '';
                    var country = data.country_name || '';
                    self.locationText.textContent = city && country ? city + ', ' + country : (country || 'Tidak diketahui');
                    self.fetchWeather(self.lat, self.lon);
                }
            })
            .catch(function() { self.weatherTemp.textContent = '--\u00B0C'; self.weatherDesc.textContent = 'Tidak tersedia'; });
    }

    getWeatherEmoji(code, temp) {
        if (code === 113) return '\u2600\uFE0F';
        if (code === 116) return '\u26C5';
        if (code === 119 || code === 122) return '\u2601\uFE0F';
        if (code >= 176 && code <= 299) return '\uD83C\uDF26\uFE0F';
        if (code >= 302 && code <= 395) return '\uD83C\uDF27\uFE0F';
        if (parseInt(temp) >= 35) return '\uD83D\uDD25';
        if (parseInt(temp) <= 5) return '\uD83E\uDD76';
        return '\uD83C\uDF21\uFE0F';
    }
}

// ===== Parallax Background (Desktop Only) =====
class ParallaxBackground {
    constructor() {
        if (isMobile) return;
        this.bgImage = document.getElementById('bgImage');
        this.targetX = 0; this.targetY = 0; this.currentX = 0; this.currentY = 0;
        this.maxOffset = 30; this.ease = 0.04;
        var self = this;
        window.addEventListener('mousemove', function(e) {
            self.targetX = ((e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * self.maxOffset;
            self.targetY = ((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)) * self.maxOffset;
        });
        this.animate();
    }
    animate() {
        var self = this;
        this.currentX += (this.targetX - this.currentX) * this.ease;
        this.currentY += (this.targetY - this.currentY) * this.ease;
        if (this.bgImage) this.bgImage.style.transform = 'translate(' + this.currentX + 'px, ' + this.currentY + 'px) scale(1.08)';
        requestAnimationFrame(function() { self.animate(); });
    }
}

// ===== Lightning Effect (Desktop Only) =====
class LightningEffect {
    constructor() {
        if (isMobile) return;
        this.flash = document.getElementById('lightningFlash');
        this.scheduleNext();
    }
    scheduleNext() {
        var self = this;
        setTimeout(function() { self.trigger(); self.scheduleNext(); }, 8000 + Math.random() * 20000);
    }
    trigger() {
        var self = this;
        if (!this.flash) return;
        this.flash.classList.add('active');
        setTimeout(function() { self.flash.classList.remove('active'); }, 400);
    }
}

// ===== Rain Effect (Desktop Only) =====
class RainEffect {
    constructor(canvas) {
        if (isMobile) return;
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.drops = []; this.splashes = [];
        this.resize();
        var self = this;
        window.addEventListener('resize', function() { self.resize(); });
        this.createDrops(); this.animate();
    }
    resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
    createDrops() {
        var count = Math.min(100, Math.floor(this.canvas.width / 8));
        this.drops = [];
        for (var i = 0; i < count; i++) {
            this.drops.push({ x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height, length: 12 + Math.random() * 25, speed: 3 + Math.random() * 6, opacity: 0.04 + Math.random() * 0.12, width: 0.4 + Math.random() * 1.2, wind: -0.5 + Math.random() * 0.3 });
        }
    }
    animate() {
        var self = this;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (var i = 0; i < this.drops.length; i++) {
            var d = this.drops[i];
            this.ctx.beginPath(); this.ctx.moveTo(d.x, d.y); this.ctx.lineTo(d.x + d.wind * 3, d.y + d.length);
            this.ctx.strokeStyle = 'rgba(180,210,255,' + d.opacity + ')'; this.ctx.lineWidth = d.width; this.ctx.lineCap = 'round'; this.ctx.stroke();
            d.y += d.speed; d.x += d.wind;
            if (d.y > this.canvas.height) {
                if (Math.random() > 0.8) this.splashes.push({ x: d.x, y: this.canvas.height - 2, radius: 1, maxRadius: 3 + Math.random() * 4, opacity: 0.15, speed: 0.3 + Math.random() * 0.3 });
                d.y = -d.length; d.x = Math.random() * this.canvas.width;
            }
        }
        for (var j = this.splashes.length - 1; j >= 0; j--) {
            var s = this.splashes[j]; s.radius += s.speed; s.opacity -= 0.008;
            if (s.opacity <= 0 || s.radius >= s.maxRadius) { this.splashes.splice(j, 1); continue; }
            this.ctx.beginPath(); this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(180,210,255,' + s.opacity + ')'; this.ctx.lineWidth = 0.5; this.ctx.stroke();
        }
        requestAnimationFrame(function() { self.animate(); });
    }
}

// ===== Particle System (Desktop Only) =====
class ParticleSystem {
    constructor(canvas) {
        if (isMobile) return;
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.particles = []; this.mouse = { x: -1000, y: -1000 }; this.mouseTrail = [];
        this.resize(); this.createParticles(); this.bindEvents(); this.animate();
    }
    resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
    createParticles() {
        var count = Math.min(40, Math.floor((this.canvas.width * this.canvas.height) / 20000));
        this.particles = [];
        for (var i = 0; i < count; i++) {
            this.particles.push({ x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, radius: Math.random() * 2 + 0.5, opacity: Math.random() * 0.4 + 0.1, pulseSpeed: Math.random() * 0.02 + 0.005, pulsePhase: Math.random() * Math.PI * 2 });
        }
    }
    bindEvents() {
        var self = this;
        window.addEventListener('resize', function() { self.resize(); self.createParticles(); });
        window.addEventListener('mousemove', function(e) { self.mouse.x = e.clientX; self.mouse.y = e.clientY; self.mouseTrail.push({ x: e.clientX, y: e.clientY, life: 1 }); if (self.mouseTrail.length > 15) self.mouseTrail.shift(); });
    }
    getParticleColor() { return getComputedStyle(document.documentElement).getPropertyValue('--particle-color').trim() || 'rgba(74,222,128,0.4)'; }
    animate() {
        var self = this;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        var color = this.getParticleColor(); var time = Date.now() * 0.001;
        for (var t = 0; t < this.mouseTrail.length; t++) {
            var pt = this.mouseTrail[t]; pt.life -= 0.03;
            if (pt.life > 0) { this.ctx.beginPath(); this.ctx.arc(pt.x, pt.y, 3 * pt.life, 0, Math.PI * 2); this.ctx.fillStyle = color.replace(/[\d.]+\)$/, (pt.life * 0.3) + ')'); this.ctx.fill(); }
        }
        this.mouseTrail = this.mouseTrail.filter(function(p) { return p.life > 0; });
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i]; p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = this.canvas.width; if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height; if (p.y > this.canvas.height) p.y = 0;
            var dx = p.x - this.mouse.x, dy = p.y - this.mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) { var force = (150 - dist) / 150 * 0.02; p.vx += dx * force * 0.01; p.vy += dy * force * 0.01; }
            p.vx *= 0.99; p.vy *= 0.99;
            var pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulsePhase) * 0.3 + 0.7;
            var co = p.opacity * pulse;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fillStyle = color.replace(/[\d.]+\)$/, co + ')'); this.ctx.fill();
            for (var j = i + 1; j < this.particles.length; j++) {
                var p2 = this.particles[j]; var cdx = p.x - p2.x, cdy = p.y - p2.y, cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cdist < 120) { this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p2.x, p2.y); this.ctx.strokeStyle = color.replace(/[\d.]+\)$/, ((1 - cdist / 120) * 0.12) + ')'); this.ctx.lineWidth = 0.5; this.ctx.stroke(); }
            }
        }
        requestAnimationFrame(function() { self.animate(); });
    }
}

// ===== Confetti System =====
class ConfettiSystem {
    constructor(canvas) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.particles = [];
        this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; this.animating = false;
        var self = this;
        window.addEventListener('resize', function() { self.canvas.width = window.innerWidth; self.canvas.height = window.innerHeight; });
    }
    burst(x, y) {
        if (isMobile) return;
        var colors = ['#4ade80', '#22d3ee', '#f472b6', '#a78bfa', '#fbbf24', '#fb923c'];
        for (var i = 0; i < 30; i++) {
            var angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
            var vel = 4 + Math.random() * 6;
            this.particles.push({ x: x || this.canvas.width / 2, y: y || this.canvas.height / 2, vx: Math.cos(angle) * vel, vy: Math.sin(angle) * vel - 3, color: colors[Math.floor(Math.random() * colors.length)], size: 3 + Math.random() * 5, life: 1, decay: 0.01 + Math.random() * 0.015, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.2, isRect: Math.random() > 0.5 });
        }
        if (!this.animating) { this.animating = true; this.animate(); }
    }
    animate() {
        var self = this;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.99; p.life -= p.decay; p.rotation += p.rotSpeed;
            if (p.life > 0) { this.ctx.save(); this.ctx.translate(p.x, p.y); this.ctx.rotate(p.rotation); this.ctx.globalAlpha = p.life; this.ctx.fillStyle = p.color; if (p.isRect) { this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); } else { this.ctx.beginPath(); this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); this.ctx.fill(); } this.ctx.restore(); }
        }
        this.particles = this.particles.filter(function(p) { return p.life > 0; });
        if (this.particles.length > 0) { requestAnimationFrame(function() { self.animate(); }); }
        else { this.animating = false; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    }
}

// ===== Music Player =====
var ytPlayerReady = false;
var onYouTubeIframeAPIReadyCallback = null;
window.onYouTubeIframeAPIReady = function() { ytPlayerReady = true; if (onYouTubeIframeAPIReadyCallback) onYouTubeIframeAPIReadyCallback(); };

class MusicPlayer {
    constructor() {
        this.isOpen = false; this.isPlaying = false; this.currentStation = null; this.currentVideoId = null;
        this.vizInterval = null; this.player = null; this.playerReady = false; this.playerCreated = false;
        this.pendingVideoId = null; this.pendingName = null;
        this.toggle = document.getElementById('musicToggle'); this.panel = document.getElementById('musicPanel');
        this.closeBtn = document.getElementById('musicClose'); this.playPauseBtn = document.getElementById('musicPlayPause');
        this.playIcon = document.getElementById('playIcon'); this.pauseIcon = document.getElementById('pauseIcon');
        this.volumeSlider = document.getElementById('volumeSlider'); this.urlInput = document.getElementById('youtubeUrl');
        this.urlPlayBtn = document.getElementById('urlPlayBtn'); this.visualizer = document.getElementById('audioVisualizer');
        this.nowPlayingText = document.querySelector('.now-playing-text');
        this.vizBars = document.querySelectorAll('.viz-bar');
        this.init();
    }
    init() {
        var self = this;
        this.toggle.addEventListener('click', function() { self.togglePanel(); });
        this.closeBtn.addEventListener('click', function() { self.togglePanel(); });
        this.playPauseBtn.addEventListener('click', function() { self.togglePlayPause(); });
        this.urlPlayBtn.addEventListener('click', function() { self.playCustomUrl(); });
        this.urlInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') self.playCustomUrl(); e.stopPropagation(); });
        this.urlInput.addEventListener('keyup', function(e) { e.stopPropagation(); });
        this.urlInput.addEventListener('keypress', function(e) { e.stopPropagation(); });
        document.querySelectorAll('.station-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { var vid = btn.dataset.video; var name = btn.dataset.name; if (vid) self.playStation(vid, name, btn); });
        });
        this.volumeSlider.addEventListener('input', function() { if (self.player && self.playerReady) self.player.setVolume(parseInt(self.volumeSlider.value)); });
        this.vizBars.forEach(function(bar) { bar.style.setProperty('--bar-height', (0.2 + Math.random() * 0.8).toFixed(2)); });
        if (ytPlayerReady) { this.createPlayer(); } else { onYouTubeIframeAPIReadyCallback = function() { self.createPlayer(); }; this.pollForYTAPI(); }
    }
    pollForYTAPI() {
        var self = this; var attempts = 0;
        var poll = setInterval(function() { attempts++; if (typeof YT !== 'undefined' && YT.Player) { ytPlayerReady = true; clearInterval(poll); if (!self.playerCreated) self.createPlayer(); } else if (attempts >= 50) clearInterval(poll); }, 200);
    }
    createPlayer() {
        if (this.playerCreated) return; if (typeof YT === 'undefined' || !YT.Player) return;
        this.playerCreated = true; var self = this;
        try {
            this.player = new YT.Player('ytPlayer', {
                height: '180', width: '280',
                playerVars: { autoplay: 0, controls: 1, disablekb: 0, fs: 0, modestbranding: 1, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
                events: {
                    onReady: function() { self.playerReady = true; self.player.setVolume(parseInt(self.volumeSlider.value)); if (self.pendingVideoId) { var v = self.pendingVideoId; self.pendingVideoId = null; self.pendingName = null; self.loadAndPlay(v); } },
                    onStateChange: function(e) { if (e.data === YT.PlayerState.PLAYING) self.setPlaying(true); else if (e.data === YT.PlayerState.PAUSED) self.setPlaying(false); else if (e.data === YT.PlayerState.ENDED && self.currentVideoId) { self.player.seekTo(0); self.player.playVideo(); } else if (e.data === YT.PlayerState.BUFFERING) self.nowPlayingText.textContent = 'Buffering...'; },
                    onError: function(e) { var msgs = { 2: 'ID tidak valid', 5: 'Tidak bisa diputar', 100: 'Tidak ditemukan', 101: 'Tidak bisa di-embed', 150: 'Tidak bisa di-embed' }; self.nowPlayingText.textContent = msgs[e.data] || 'Error'; self.setPlaying(false); }
                }
            });
        } catch (err) { this.playerCreated = false; var s = this; setTimeout(function() { s.createPlayer(); }, 1000); }
    }
    togglePanel() { this.isOpen = !this.isOpen; this.panel.classList.toggle('open', this.isOpen); }
    playStation(videoId, name, btnEl) {
        document.querySelectorAll('.station-btn').forEach(function(b) { b.classList.remove('active'); });
        if (btnEl) btnEl.classList.add('active');
        this.currentVideoId = videoId; this.currentStation = name;
        this.nowPlayingText.textContent = 'Loading: ' + name; this.loadAndPlay(videoId);
    }
    playCustomUrl() {
        var url = this.urlInput.value.trim(); if (!url) return;
        var videoId = this.extractVideoId(url);
        if (videoId) { document.querySelectorAll('.station-btn').forEach(function(b) { b.classList.remove('active'); }); this.currentVideoId = videoId; this.currentStation = 'Custom YouTube'; this.nowPlayingText.textContent = 'Loading...'; this.loadAndPlay(videoId); }
        else { var s = this; this.nowPlayingText.textContent = 'URL tidak valid'; setTimeout(function() { s.nowPlayingText.textContent = s.currentStation || 'Pilih station atau paste link YouTube'; }, 3000); }
    }
    extractVideoId(url) {
        var patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/];
        for (var i = 0; i < patterns.length; i++) { var m = url.match(patterns[i]); if (m) return m[1]; } return null;
    }
    loadAndPlay(videoId) {
        if (!this.playerReady) { this.pendingVideoId = videoId; this.pendingName = this.currentStation; this.nowPlayingText.textContent = 'Menyiapkan player...'; if (!this.playerCreated && typeof YT !== 'undefined' && YT.Player) this.createPlayer(); return; }
        try { this.player.loadVideoById({ videoId: videoId, suggestedQuality: 'small' }); this.player.setVolume(parseInt(this.volumeSlider.value)); } catch (err) { this.nowPlayingText.textContent = 'Gagal memutar'; }
    }
    togglePlayPause() {
        if (!this.player || !this.playerReady) { this.nowPlayingText.textContent = 'Tunggu sebentar...'; return; }
        if (this.isPlaying) { this.player.pauseVideo(); } else if (this.currentVideoId) { try { var st = this.player.getPlayerState(); if (st === YT.PlayerState.PAUSED || st === YT.PlayerState.CUED) this.player.playVideo(); else this.loadAndPlay(this.currentVideoId); } catch (e) { this.loadAndPlay(this.currentVideoId); } }
    }
    setPlaying(playing) {
        this.isPlaying = playing;
        this.playIcon.style.display = playing ? 'none' : 'block'; this.pauseIcon.style.display = playing ? 'block' : 'none';
        this.toggle.classList.toggle('playing', playing); this.visualizer.classList.toggle('active', playing);
        if (playing) { this.startViz(); if (this.player && this.playerReady) { try { var vd = this.player.getVideoData(); if (vd && vd.title) { this.nowPlayingText.textContent = vd.title; this.currentStation = vd.title; } } catch (e) {} } }
        else this.stopViz();
    }
    startViz() { var self = this; if (this.vizInterval) clearInterval(this.vizInterval); this.vizInterval = setInterval(function() { self.vizBars.forEach(function(bar) { bar.style.setProperty('--bar-height', (0.15 + Math.random() * 0.85).toFixed(2)); }); }, 200); }
    stopViz() { if (this.vizInterval) { clearInterval(this.vizInterval); this.vizInterval = null; } }
}

// ===== Calculator =====
class Calculator {
    constructor(confetti) {
        this.confetti = confetti; this.currentInput = '0'; this.expression = ''; this.lastResult = null;
        this.operator = null; this.previousValue = null; this.waitingForOperand = false;
        this.history = []; this.scientificOpen = false; this.historyOpen = false; this.parenthesesCount = 0;
        this.resultEl = document.getElementById('result'); this.expressionEl = document.getElementById('expression');
        this.scientificPanel = document.getElementById('scientificPanel'); this.historyPanel = document.getElementById('historyPanel');
        this.historyList = document.getElementById('historyList'); this.keyboardHint = document.getElementById('keyboardHint');
        this.copyBtn = document.getElementById('copyBtn'); this.copyToast = document.getElementById('copyToast');
        this.calculatorEl = document.getElementById('calculator');
        this.init();
    }
    init() { this.bindButtons(); this.bindKeyboard(); this.bindThemeSwitcher(); this.bindHistoryToggle(); this.bindScientificToggle(); this.bindCopyPaste(); this.loadHistory(); this.loadTheme(); }
    bindButtons() {
        var self = this;
        document.querySelectorAll('.btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) { self.createRipple(e, btn); var action = btn.dataset.action; self.handleAction(action); if (btn.classList.contains('btn-operator') || btn.classList.contains('btn-equal')) { btn.classList.add('btn-shockwave'); setTimeout(function() { btn.classList.remove('btn-shockwave'); }, 600); } });
            btn.addEventListener('mousedown', function(e) { var rect = btn.getBoundingClientRect(); btn.style.setProperty('--ripple-x', ((e.clientX - rect.left) / rect.width * 100) + '%'); btn.style.setProperty('--ripple-y', ((e.clientY - rect.top) / rect.height * 100) + '%'); });
        });
    }
    createRipple(e, btn) {
        var ripple = document.createElement('span'); var rect = btn.getBoundingClientRect(); var size = Math.max(rect.width, rect.height) * 2.5;
        ripple.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - rect.left - size / 2) + 'px;top:' + (e.clientY - rect.top - size / 2) + 'px;border-radius:50%;background:var(--ripple);transform:scale(0);animation:rippleAnim 0.6s ease-out forwards;pointer-events:none;z-index:1;';
        if (!document.getElementById('rippleStyle')) { var s = document.createElement('style'); s.id = 'rippleStyle'; s.textContent = '@keyframes rippleAnim { to { transform: scale(1); opacity: 0; } }'; document.head.appendChild(s); }
        btn.appendChild(ripple); setTimeout(function() { ripple.remove(); }, 600);
    }
    bindKeyboard() {
        var self = this; var hintTimeout;
        document.addEventListener('keydown', function(e) {
            var key = e.key;
            if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'v')) { if (key === 'c') { e.preventDefault(); self.copyResult(); } if (key === 'v') { e.preventDefault(); self.pasteValue(); } return; }
            if (document.activeElement && document.activeElement.classList.contains('url-input')) return;
            if (key === 'F11') return;
            e.preventDefault();
            self.keyboardHint.classList.add('show'); clearTimeout(hintTimeout); hintTimeout = setTimeout(function() { self.keyboardHint.classList.remove('show'); }, 1500);
            var keyMap = { '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '.': 'decimal', ',': 'decimal', '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide', '%': 'percent', 'Enter': 'equals', '=': 'equals', 'Backspace': 'backspace', 'Delete': 'clear', 'Escape': 'clear', '(': 'paren-open', ')': 'paren-close' };
            if (keyMap[key]) { self.handleAction(keyMap[key]); var btn = document.querySelector('[data-action="' + keyMap[key] + '"]'); if (btn) { btn.classList.add('calculating'); setTimeout(function() { btn.classList.remove('calculating'); }, 200); } }
        });
    }
    bindCopyPaste() { var self = this; this.copyBtn.addEventListener('click', function() { self.copyResult(); }); }
    copyResult() {
        var self = this; var value = this.currentInput === 'Error' ? '' : this.currentInput; if (!value) return;
        navigator.clipboard.writeText(value).then(function() { self.copyToast.classList.add('show'); self.copyBtn.classList.add('copied'); setTimeout(function() { self.copyToast.classList.remove('show'); self.copyBtn.classList.remove('copied'); }, 1500); }).catch(function() {
            var ta = document.createElement('textarea'); ta.value = value; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            self.copyToast.classList.add('show'); self.copyBtn.classList.add('copied'); setTimeout(function() { self.copyToast.classList.remove('show'); self.copyBtn.classList.remove('copied'); }, 1500);
        });
    }
    pasteValue() {
        var self = this;
        navigator.clipboard.readText().then(function(text) { var cleaned = text.trim().replace(/[^0-9.\-]/g, ''); if (cleaned && !isNaN(parseFloat(cleaned))) { self.currentInput = cleaned; self.waitingForOperand = false; self.updateDisplay(); self.resultEl.classList.add('bounce'); setTimeout(function() { self.resultEl.classList.remove('bounce'); }, 400); } }).catch(function() {});
    }
    bindThemeSwitcher() {
        document.querySelectorAll('.theme-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { var theme = btn.dataset.theme; document.documentElement.setAttribute('data-theme', theme); document.querySelectorAll('.theme-btn').forEach(function(b) { b.classList.remove('active'); }); btn.classList.add('active'); localStorage.setItem('SobingGanteng-theme', theme); });
        });
    }
    loadTheme() { var saved = localStorage.getItem('SobingGanteng-theme'); if (saved) { document.documentElement.setAttribute('data-theme', saved); document.querySelectorAll('.theme-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.theme === saved); }); } }
    bindScientificToggle() { var self = this; var toggle = document.getElementById('sciToggle'); toggle.addEventListener('click', function() { self.scientificOpen = !self.scientificOpen; self.scientificPanel.classList.toggle('open', self.scientificOpen); toggle.classList.toggle('active', self.scientificOpen); }); }
    bindHistoryToggle() {
        var self = this; var toggle = document.getElementById('historyToggle');
        toggle.addEventListener('click', function() { self.historyOpen = !self.historyOpen; self.historyPanel.classList.toggle('open', self.historyOpen); toggle.classList.toggle('active', self.historyOpen); });
        document.getElementById('clearHistory').addEventListener('click', function() { self.history = []; self.saveHistory(); self.renderHistory(); });
    }
    handleAction(action) {
        if (/^[0-9]$/.test(action)) { this.inputNumber(action); return; }
        switch (action) {
            case 'decimal': this.inputDecimal(); break; case 'add': this.inputOperator('+'); break; case 'subtract': this.inputOperator('-'); break;
            case 'multiply': this.inputOperator('\u00D7'); break; case 'divide': this.inputOperator('\u00F7'); break; case 'equals': this.calculate(); break;
            case 'clear': this.clear(); break; case 'backspace': this.backspace(); break; case 'percent': this.percent(); break;
            case 'sin': this.scientificFunc('sin'); break; case 'cos': this.scientificFunc('cos'); break; case 'tan': this.scientificFunc('tan'); break;
            case 'log': this.scientificFunc('log'); break; case 'ln': this.scientificFunc('ln'); break; case 'sqrt': this.scientificFunc('sqrt'); break;
            case 'pow': this.scientificPow(2); break; case 'cube': this.scientificPow(3); break; case 'factorial': this.factorial(); break;
            case 'pi': this.inputConstant(Math.PI); break; case 'e': this.inputConstant(Math.E); break; case 'abs': this.scientificFunc('abs'); break;
            case 'inv': this.inverse(); break; case 'exp': this.inputOperator('E'); break; case 'mod': this.inputOperator('mod'); break;
            case 'paren-open': this.inputParen('('); break; case 'paren-close': this.inputParen(')'); break; case 'pow-y': this.inputOperator('^'); break;
        }
    }
    inputNumber(num) { if (this.waitingForOperand) { this.currentInput = num; this.waitingForOperand = false; } else { this.currentInput = this.currentInput === '0' ? num : this.currentInput + num; } this.updateDisplay(); }
    inputDecimal() { if (this.waitingForOperand) { this.currentInput = '0.'; this.waitingForOperand = false; } else if (!this.currentInput.includes('.')) { this.currentInput += '.'; } this.updateDisplay(); }
    inputOperator(op) {
        var current = parseFloat(this.currentInput);
        if (this.previousValue !== null && !this.waitingForOperand) { var result = this.compute(this.previousValue, current, this.operator); this.previousValue = result; this.currentInput = this.formatNumber(result); }
        else { this.previousValue = current; }
        this.expression = this.formatDisplay(this.previousValue) + ' ' + op; this.operator = op; this.waitingForOperand = true; this.updateDisplay(); this.highlightOperator(op);
    }
    inputConstant(value) { this.currentInput = String(value); if (this.waitingForOperand) this.waitingForOperand = false; this.updateDisplay(); }
    inputParen(paren) {
        if (paren === '(') { if (!this.waitingForOperand && this.currentInput !== '0') this.inputOperator('\u00D7'); this.expression += ' ('; this.parenthesesCount++; this.waitingForOperand = true; }
        else if (paren === ')' && this.parenthesesCount > 0) { this.expression += ' ' + this.currentInput + ' )'; this.parenthesesCount--; }
        this.updateDisplay();
    }
    compute(a, b, op) { switch (op) { case '+': return a + b; case '-': return a - b; case '\u00D7': return a * b; case '\u00F7': return b !== 0 ? a / b : NaN; case '^': return Math.pow(a, b); case 'mod': return a % b; case 'E': return a * Math.pow(10, b); default: return b; } }
    calculate() {
        if (this.operator === null && this.lastResult === null) return;
        var current = parseFloat(this.currentInput); var result, fullExpr;
        if (this.previousValue !== null) { result = this.compute(this.previousValue, current, this.operator); fullExpr = this.expression + ' ' + this.formatDisplay(current); } else return;
        var rEl = this.resultEl; var cEl = this.calculatorEl;
        rEl.classList.add('glitch'); setTimeout(function() { rEl.classList.remove('glitch'); }, 300);
        cEl.classList.add('screen-shake'); setTimeout(function() { cEl.classList.remove('screen-shake'); }, 400);
        rEl.classList.add('bounce'); setTimeout(function() { rEl.classList.remove('bounce'); }, 400);
        if (!isNaN(result) && isFinite(result)) { var rect = cEl.getBoundingClientRect(); this.confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 3); this.addHistory(fullExpr, result); }
        this.expression = ''; this.currentInput = this.formatNumber(result); this.lastResult = result; this.previousValue = null; this.operator = null; this.waitingForOperand = true; this.clearOperatorHighlight(); this.updateDisplay();
    }
    scientificFunc(func) {
        var c = parseFloat(this.currentInput); var result, expr;
        switch (func) {
            case 'sin': result = Math.sin(c * Math.PI / 180); expr = 'sin(' + this.formatDisplay(c) + '\u00B0)'; break;
            case 'cos': result = Math.cos(c * Math.PI / 180); expr = 'cos(' + this.formatDisplay(c) + '\u00B0)'; break;
            case 'tan': result = Math.tan(c * Math.PI / 180); expr = 'tan(' + this.formatDisplay(c) + '\u00B0)'; break;
            case 'log': result = Math.log10(c); expr = 'log(' + this.formatDisplay(c) + ')'; break;
            case 'ln': result = Math.log(c); expr = 'ln(' + this.formatDisplay(c) + ')'; break;
            case 'sqrt': result = Math.sqrt(c); expr = '\u221A(' + this.formatDisplay(c) + ')'; break;
            case 'abs': result = Math.abs(c); expr = '|' + this.formatDisplay(c) + '|'; break;
            default: return;
        }
        this.addHistory(expr, result); this.expression = expr; this.currentInput = this.formatNumber(result); this.waitingForOperand = true;
        var el = this.resultEl; el.classList.add('glitch'); setTimeout(function() { el.classList.remove('glitch'); }, 300); el.classList.add('bounce'); setTimeout(function() { el.classList.remove('bounce'); }, 400); this.updateDisplay();
    }
    scientificPow(power) {
        var c = parseFloat(this.currentInput); var result = Math.pow(c, power); var expr = this.formatDisplay(c) + (power === 2 ? '\u00B2' : '\u00B3');
        this.addHistory(expr, result); this.expression = expr; this.currentInput = this.formatNumber(result); this.waitingForOperand = true;
        var el = this.resultEl; el.classList.add('bounce'); setTimeout(function() { el.classList.remove('bounce'); }, 400); this.updateDisplay();
    }
    factorial() {
        var c = parseInt(this.currentInput); if (c < 0 || c > 170) { this.currentInput = 'Error'; this.updateDisplay(); return; }
        var result = 1; for (var i = 2; i <= c; i++) result *= i;
        this.addHistory(c + '!', result); this.expression = c + '!'; this.currentInput = this.formatNumber(result); this.waitingForOperand = true;
        var el = this.resultEl; el.classList.add('bounce'); setTimeout(function() { el.classList.remove('bounce'); }, 400); this.updateDisplay();
    }
    inverse() {
        var c = parseFloat(this.currentInput); if (c === 0) { this.currentInput = 'Error'; this.updateDisplay(); return; }
        var result = 1 / c; var expr = '1/' + this.formatDisplay(c);
        this.addHistory(expr, result); this.expression = expr; this.currentInput = this.formatNumber(result); this.waitingForOperand = true;
        var el = this.resultEl; el.classList.add('bounce'); setTimeout(function() { el.classList.remove('bounce'); }, 400); this.updateDisplay();
    }
    percent() { var c = parseFloat(this.currentInput); this.currentInput = this.previousValue !== null ? this.formatNumber((this.previousValue * c) / 100) : this.formatNumber(c / 100); this.updateDisplay(); }
    clear() { this.currentInput = '0'; this.expression = ''; this.previousValue = null; this.operator = null; this.waitingForOperand = false; this.lastResult = null; this.parenthesesCount = 0; this.clearOperatorHighlight(); this.updateDisplay(); }
    backspace() { if (this.waitingForOperand) return; this.currentInput = this.currentInput.length > 1 ? this.currentInput.slice(0, -1) : '0'; this.updateDisplay(); }
    updateDisplay() {
        var dv = this.currentInput === 'Error' ? 'Error' : this.formatDisplayValue(this.currentInput);
        this.resultEl.textContent = dv; this.expressionEl.textContent = this.expression;
        this.resultEl.classList.remove('shrink', 'shrink-more');
        if (dv.length > 12) this.resultEl.classList.add('shrink-more'); else if (dv.length > 9) this.resultEl.classList.add('shrink');
    }
    formatNumber(num) { if (isNaN(num) || !isFinite(num)) return 'Error'; return parseFloat(num.toPrecision(12)).toString(); }
    formatDisplay(num) { return typeof num === 'string' ? num : this.formatNumber(num); }
    formatDisplayValue(value) {
        if (value === 'Error') return value;
        var parts = value.split('.'); var intPart = parts[0]; var decPart = parts[1];
        if (!intPart.includes('e') && !intPart.includes('E')) { var isNeg = intPart.startsWith('-'); var absInt = isNeg ? intPart.slice(1) : intPart; var formatted = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, ','); var r = isNeg ? '-' + formatted : formatted; return decPart !== undefined ? r + '.' + decPart : r; }
        return value;
    }
    highlightOperator(op) { this.clearOperatorHighlight(); var opMap = { '+': 'add', '-': 'subtract', '\u00D7': 'multiply', '\u00F7': 'divide' }; var action = opMap[op]; if (action) { var btn = document.querySelector('.btn-operator[data-action="' + action + '"]'); if (btn) btn.classList.add('active-op'); } }
    clearOperatorHighlight() { document.querySelectorAll('.btn-operator').forEach(function(b) { b.classList.remove('active-op'); }); }
    addHistory(expression, result) { this.history.unshift({ expression: expression, result: this.formatNumber(result), timestamp: Date.now() }); if (this.history.length > 50) this.history.pop(); this.saveHistory(); this.renderHistory(); }
    renderHistory() {
        var self = this;
        if (this.history.length === 0) { this.historyList.innerHTML = '<div class="history-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>Belum ada riwayat</p></div>'; return; }
        var html = '';
        for (var i = 0; i < this.history.length; i++) { var item = this.history[i]; html += '<div class="history-item" data-index="' + i + '" style="animation-delay:' + (i * 0.05) + 's"><div class="history-expr">' + this.escapeHtml(item.expression) + '</div><div class="history-result">= ' + this.formatDisplayValue(item.result) + '</div></div>'; }
        this.historyList.innerHTML = html;
        this.historyList.querySelectorAll('.history-item').forEach(function(el) { el.addEventListener('click', function() { var idx = parseInt(el.dataset.index); self.currentInput = self.history[idx].result; self.waitingForOperand = true; self.resultEl.classList.add('bounce'); setTimeout(function() { self.resultEl.classList.remove('bounce'); }, 400); self.updateDisplay(); }); });
    }
    saveHistory() { try { localStorage.setItem('SobingGanteng-history', JSON.stringify(this.history)); } catch (e) { this.history = this.history.slice(0, 25); localStorage.setItem('SobingGanteng-history', JSON.stringify(this.history)); } }
    loadHistory() { try { var saved = localStorage.getItem('SobingGanteng-history'); if (saved) { this.history = JSON.parse(saved); this.renderHistory(); } } catch (e) { this.history = []; } }
    escapeHtml(str) { var div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    // Info Widget - always runs (lightweight)
    new InfoWidget();

    // Heavy effects - desktop only
    new ParallaxBackground();
    new LightningEffect();

    var rainCanvas = document.getElementById('rainCanvas');
    if (rainCanvas) new RainEffect(rainCanvas);

    var particleCanvas = document.getElementById('particleCanvas');
    if (particleCanvas) new ParticleSystem(particleCanvas);

    var confettiCanvas = document.getElementById('confettiCanvas');
    var confetti = new ConfettiSystem(confettiCanvas);

    new Calculator(confetti);
    new MusicPlayer();
});
