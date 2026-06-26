class DashboardUI {
    constructor() {
        this.app = null;

        // Sliders
        this.sliderCount = document.getElementById('slider-particle-count');
        this.sliderSize = document.getElementById('slider-particle-size');
        this.sliderMorph = document.getElementById('slider-morph-speed');
        this.sliderGravity = document.getElementById('slider-gravity');
        this.sliderTurbulence = document.getElementById('slider-turbulence');
        this.toggleCam = document.getElementById('toggle-camera');

        // Slider value readouts
        this.valCount = document.getElementById('val-particle-count');
        this.valSize = document.getElementById('val-particle-size');
        this.valMorph = document.getElementById('val-morph-speed');
        this.valGravity = document.getElementById('val-gravity');
        this.valTurbulence = document.getElementById('val-turbulence');

        // Camera prompt
        this.cameraPrompt = document.getElementById('camera-prompt');
        this.btnEnableCam = document.getElementById('btn-enable-camera');
        this.btnSkipCam = document.getElementById('btn-skip-camera');

        // Tracking badge
        this.trackingStatus = document.getElementById('tracking-status');

        // Telemetry
        this.metricFps = document.getElementById('metric-fps');
        this.metricGesture = document.getElementById('metric-gesture');
        this.metricHands = document.getElementById('metric-hands');
        this.metricPinch = document.getElementById('metric-pinch');

        // Shape dock items
        this.dockItems = document.querySelectorAll('.dock-item');

        // Active shape readout
        this.readoutShape = document.getElementById('readout-shape');

        // Palette chips (theme)
        this.paletteChips = document.querySelectorAll('.palette-chip');

        // Gesture rows
        this.gestureRows = document.querySelectorAll('.g-row');

        // Drawers
        this.drawerLeft = document.getElementById('drawer-left');
        this.drawerRight = document.getElementById('drawer-right');
        this.toggleLeft = document.getElementById('toggle-left');
        this.toggleRight = document.getElementById('toggle-right');
    }

    init(appInstance) {
        this.app = appInstance;
        this.bindEvents();
        this.cameraPrompt.style.display = 'flex';
    }

    bindEvents() {
        // ─ Sliders ─
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

        // ─ Camera Toggle ─
        this.toggleCam.addEventListener('change', (e) => {
            if (e.target.checked) this.startTracking();
            else this.stopTracking();
        });

        // ─ Camera Prompt ─
        this.btnEnableCam.addEventListener('click', () => {
            this.cameraPrompt.style.display = 'none';
            this.toggleCam.checked = true;
            this.startTracking();
        });
        this.btnSkipCam.addEventListener('click', () => {
            this.cameraPrompt.style.display = 'none';
            this.toggleCam.checked = false;
        });

        // ─ Shape Dock ─
        this.dockItems.forEach((item) => {
            item.addEventListener('click', () => {
                const shape = item.getAttribute('data-shape');
                this.app.particles.morphTo(shape);
                this.setActiveShapeButton(shape);
            });
        });

        // ─ Palette Chips (theme) ─
        this.paletteChips.forEach((chip) => {
            chip.addEventListener('click', () => {
                const theme = chip.getAttribute('data-theme');
                this.app.particles.updateSettings({ theme: theme });
                this.paletteChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });

        // ─ Gesture Rows ─
        this.gestureRows.forEach((row) => {
            row.addEventListener('click', () => {
                const shape = row.getAttribute('data-shape');
                if (shape) this.app.particles.morphTo(shape);
            });
        });

        // ─ Drawer Toggles ─
        this.toggleLeft.addEventListener('click', () => {
            this.drawerLeft.classList.toggle('collapsed');
        });
        this.toggleRight.addEventListener('click', () => {
            this.drawerRight.classList.toggle('collapsed');
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
            this.trackingStatus.className = 'status-chip chip-on';
            this.trackingStatus.querySelector('.badge-text').textContent = 'Tracking';
        } else {
            this.trackingStatus.className = 'status-chip chip-off';
            this.trackingStatus.querySelector('.badge-text').textContent = 'Offline';
        }
    }

    setActiveShapeButton(shapeName) {
        this.dockItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-shape') === shapeName);
        });
        if (this.readoutShape) {
            this.readoutShape.textContent = shapeName;
        }
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
        this.gestureRows.forEach(row => {
            row.classList.toggle('active', row.id === activeId);
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
