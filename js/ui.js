class DashboardUI {
    constructor() {
        this.app = null;

        this.sliderCount = document.getElementById('slider-particle-count');
        this.sliderSize = document.getElementById('slider-particle-size');
        this.sliderMorph = document.getElementById('slider-morph-speed');
        this.sliderGravity = document.getElementById('slider-gravity');
        this.sliderTurbulence = document.getElementById('slider-turbulence');
        this.selectTheme = document.getElementById('select-theme');
        this.toggleCam = document.getElementById('toggle-camera');

        this.valCount = document.getElementById('val-particle-count');
        this.valSize = document.getElementById('val-particle-size');
        this.valMorph = document.getElementById('val-morph-speed');
        this.valGravity = document.getElementById('val-gravity');
        this.valTurbulence = document.getElementById('val-turbulence');

        this.cameraPrompt = document.getElementById('camera-prompt');
        this.btnEnableCam = document.getElementById('btn-enable-camera');
        this.btnSkipCam = document.getElementById('btn-skip-camera');

        this.trackingStatus = document.getElementById('tracking-status');

        this.metricFps = document.getElementById('metric-fps');
        this.metricGesture = document.getElementById('metric-gesture');
        this.metricHands = document.getElementById('metric-hands');
        this.metricPinch = document.getElementById('metric-pinch');

        this.manualTabs = document.querySelectorAll('.btn-tab');
        this.gestureItems = document.querySelectorAll('.gesture-item');
    }

    init(appInstance) {
        this.app = appInstance;
        this.bindEvents();
        // Show camera permission prompt on startup
        this.cameraPrompt.style.display = 'flex';
    }

    bindEvents() {
        // Sliders
        this.sliderCount.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.valCount.textContent = val.toLocaleString();
            this.app.particles.updateSettings({ particleCount: val });
        });
        this.sliderSize.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.valSize.textContent = val.toFixed(2);
            this.app.particles.updateSettings({ particleSize: val });
        });
        this.sliderMorph.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.valMorph.textContent = val.toFixed(2);
            this.app.particles.updateSettings({ morphSpeed: val });
        });
        this.sliderGravity.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.valGravity.textContent = val.toFixed(1);
            this.app.particles.updateSettings({ gravity: val });
        });
        this.sliderTurbulence.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.valTurbulence.textContent = val.toFixed(2);
            this.app.particles.updateSettings({ turbulence: val });
        });

        // Theme dropdown
        this.selectTheme.addEventListener('change', (e) => {
            this.app.particles.updateSettings({ theme: e.target.value });
        });

        // Camera toggle
        this.toggleCam.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startTracking();
            } else {
                this.stopTracking();
            }
        });

        // Prompt buttons
        this.btnEnableCam.addEventListener('click', () => {
            this.cameraPrompt.style.display = 'none';
            this.toggleCam.checked = true;
            this.startTracking();
        });
        this.btnSkipCam.addEventListener('click', () => {
            this.cameraPrompt.style.display = 'none';
            this.toggleCam.checked = false;
        });

        // Manual shape tabs
        this.manualTabs.forEach((btn) => {
            btn.addEventListener('click', () => {
                const shape = btn.getAttribute('data-shape');
                this.app.particles.morphTo(shape);
                this.setActiveShapeButton(shape);
            });
        });

        // Gesture list items also trigger shape
        this.gestureItems.forEach((item) => {
            item.addEventListener('click', () => {
                const shape = item.getAttribute('data-shape');
                this.app.particles.morphTo(shape);
            });
        });
    }

    startTracking() {
        console.log('[UI] Starting camera tracking...');
        this.app.handTracker.startCamera()
            .then(() => {
                console.log('[UI] Camera tracking active.');
                this.setTrackingBadge(true);
            })
            .catch((err) => {
                console.error('[UI] Camera failed:', err);
                this.toggleCam.checked = false;
                this.setTrackingBadge(false);
                alert('Could not access camera. Using mouse/touch controls instead.');
            });
    }

    stopTracking() {
        this.app.handTracker.stopCamera();
        this.setTrackingBadge(false);
    }

    setTrackingBadge(isActive) {
        if (isActive) {
            this.trackingStatus.className = 'badge badge-active';
            this.trackingStatus.querySelector('.badge-text').textContent = 'Tracking Active';
        } else {
            this.trackingStatus.className = 'badge badge-inactive';
            this.trackingStatus.querySelector('.badge-text').textContent = 'Camera Off';
        }
    }

    setActiveShapeButton(shapeName) {
        this.manualTabs.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-shape') === shapeName);
        });
    }

    highlightGestureGuide(gestureName) {
        const idMap = {
            'Fist': 'ref-gesture-0',
            'Index Point': 'ref-gesture-1',
            'Peace Sign': 'ref-gesture-2',
            'Three Fingers': 'ref-gesture-3',
            'Four Fingers': 'ref-gesture-4',
            'Open Palm': 'ref-gesture-5'
        };
        const activeId = idMap[gestureName] || '';
        this.gestureItems.forEach(item => {
            item.classList.toggle('active', item.id === activeId);
        });
    }

    updateTelemetry(fps, gesture, handCount, isPinching) {
        this.metricFps.textContent = Math.round(fps);
        this.metricGesture.textContent = gesture;
        this.metricHands.textContent = handCount;
        this.metricPinch.textContent = isPinching ? 'Yes' : 'No';
        if (handCount > 0) {
            this.highlightGestureGuide(gesture);
        } else {
            this.highlightGestureGuide(null);
        }
    }
}
window.DashboardUI = DashboardUI;
