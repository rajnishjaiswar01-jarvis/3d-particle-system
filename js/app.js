class ChronoSwarmApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Modules
        this.particles = null;
        this.handTracker = null;
        this.ui = null;
        
        // Clock & Performance
        this.clock = new THREE.Clock();
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 60;
        
        // Mouse interaction fallback states
        this.mouse = new THREE.Vector2();
        this.mouse3D = new THREE.Vector3();
        this.isMouseDown = false;
        this.mouseActive = false;
        this.mouseTimeout = null;
        
        // Configuration settings
        this.settings = {
            gestureMorphEnabled: true
        };
    }

    init() {
        this.setupWebGL();
        this.setupLights();
        this.setupFallbackInteractions();
        
        // Instantiate core modules
        this.particles = new ParticleSystemManager(this.scene);
        this.handTracker = new HandTracker();
        this.ui = new DashboardUI();
        window.UI = this.ui;
        
        // Initialize hand tracking and UI dashboard
        this.handTracker.init()
            .then(() => {
                this.ui.init(this);
            })
            .catch(err => {
                console.error("Failed to initialize hand tracker: ", err);
                alert("MediaPipe Hands script failed to load. Operating in mouse fallback mode.");
                this.ui.init(this);
            });

        // Set hand tracker results listener
        this.handTracker.setResultsCallback((data) => this.handleHandTrackingResults(data));
        
        // Synchronize browser resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start loop
        this.animate(0);
    }

    setupWebGL() {
        this.scene = new THREE.Scene();
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 18);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1);
        this.renderer.setClearColor(0x0a0b10);
        this.container.appendChild(this.renderer.domElement);
        
        // Orbit Controls for standard navigation
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 45;
        this.controls.minDistance = 6;
    }

    setupLights() {
        // Ambient base glow
        const ambientLight = new THREE.AmbientLight(0x111222);
        this.scene.add(ambientLight);
        
        // Two rotating colorful pointlights to give beautiful background colors
        this.pointLight1 = new THREE.PointLight(0x00c3ff, 1.2, 50);
        this.pointLight1.position.set(10, 10, 10);
        this.scene.add(this.pointLight1);

        this.pointLight2 = new THREE.PointLight(0xff3c6d, 1.2, 50);
        this.pointLight2.position.set(-10, -10, 10);
        this.scene.add(this.pointLight2);
    }

    setupFallbackInteractions() {
        // Project screenspace mouse to 3D space
        const raycaster = new THREE.Raycaster();
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z=0 plane

        const updateMousePosition = (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            // Project ray from camera to mouse cursor
            raycaster.setFromCamera(this.mouse, this.camera);
            const intersectPoint = new THREE.Vector3();
            const hit = raycaster.ray.intersectPlane(planeZ, intersectPoint);
            if (!hit) return;
            
            this.mouse3D.copy(intersectPoint);
            this.mouseActive = true;
            
            // Reset mouse activity timer
            clearTimeout(this.mouseTimeout);
            this.mouseTimeout = setTimeout(() => {
                if (!this.isMouseDown) {
                    this.mouseActive = false;
                }
            }, 2500);
        };

        window.addEventListener('mousemove', updateMousePosition);
        
        // Mouse click triggers "Pinch Contraction"
        window.addEventListener('mousedown', (e) => {
            // Prevent interference with sidebar menus
            if (e.target.closest('#ui-overlay') || e.target.closest('.overlay-prompt')) return;
            
            this.isMouseDown = true;
            this.mouseActive = true;
            this.controls.enabled = false; // Disable orbit controls during drag attraction
            updateMousePosition(e);
        });

        window.addEventListener('mouseup', () => {
            if (this.isMouseDown) {
                this.isMouseDown = false;
                this.controls.enabled = true; // Re-enable camera navigation
            }
        });

        // Touch support
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                updateMousePosition(e.touches[0]);
            }
        });
        
        window.addEventListener('touchstart', (e) => {
            if (e.target.closest('#ui-overlay') || e.target.closest('.overlay-prompt')) return;
            this.isMouseDown = true;
            this.mouseActive = true;
            this.controls.enabled = false;
            if (e.touches.length > 0) {
                updateMousePosition(e.touches[0]);
            }
        });
        
        window.addEventListener('touchend', () => {
            this.isMouseDown = false;
            this.controls.enabled = true;
        });
    }

    handleHandTrackingResults(handData) {
        if (!handData.active) return;
        
        // Rotate scene slightly based on hand tilt
        if (this.particles && this.particles.points) {
            this.particles.points.rotation.z = this.particles.points.rotation.z * 0.9 + handData.rotation * 0.1;
        }

        // Auto shape morphing mapping based on gesture
        if (this.settings.gestureMorphEnabled && handData.gesture !== 'None') {
            let targetShape = null;
            
            switch (handData.gesture) {
                case 'Index Point': targetShape = 'Saturn'; break;
                case 'Peace Sign': targetShape = 'Heart'; break;
                case 'Three Fingers': targetShape = 'Flower'; break;
                case 'Four Fingers': targetShape = 'Torus'; break;
                case 'Open Palm': targetShape = 'Fireworks'; break;
                case 'Fist': targetShape = 'DNA'; break;
            }
            
            if (targetShape) {
                this.particles.morphTo(targetShape);
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Animation render loop
    animate(timestamp) {
        requestAnimationFrame((t) => this.animate(t));
        
        const deltaTime = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Calculate Frames Per Second (FPS)
        this.frameCount++;
        if (timestamp - this.lastFpsUpdate >= 1000) {
            this.fps = (this.frameCount * 1000) / (timestamp - this.lastFpsUpdate);
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;
        }

        // Spin light sources slowly in orbit
        if (this.pointLight1 && this.pointLight2) {
            const lightSpeed = 0.6;
            this.pointLight1.position.x = Math.sin(time * lightSpeed) * 15;
            this.pointLight1.position.z = Math.cos(time * lightSpeed) * 15;
            
            this.pointLight2.position.x = -Math.sin(time * lightSpeed * 0.8) * 15;
            this.pointLight2.position.z = -Math.cos(time * lightSpeed * 0.8) * 15;
        }

        // Get hand coordinates or use mouse fallback coordinates
        let activeInteraction = {
            active: false,
            x: 0,
            y: 0,
            z: 0,
            isPinching: false,
            pinchStrength: 0,
            gesture: 'None',
            handCount: 0
        };

        if (this.handTracker && this.handTracker.handData.active) {
            // Camera tracking coordinates
            activeInteraction = {
                active: true,
                x: this.handTracker.handData.x,
                y: this.handTracker.handData.y,
                z: this.handTracker.handData.z,
                isPinching: this.handTracker.handData.isPinching,
                pinchStrength: this.handTracker.handData.pinchStrength,
                gesture: this.handTracker.handData.gesture,
                handCount: this.handTracker.handData.handCount
            };
        } else if (this.mouseActive) {
            // Mouse tracking fallback coordinates
            activeInteraction = {
                active: true,
                x: this.mouse3D.x,
                y: this.mouse3D.y,
                z: 0,
                isPinching: this.isMouseDown, // Mouse click acts as a pinch contraction
                pinchStrength: this.isMouseDown ? 0.95 : 0,
                gesture: this.isMouseDown ? 'Pinching' : 'Hovering',
                handCount: 0
            };
        }

        // Update particle physics simulation
        this.particles.update(deltaTime, time, activeInteraction);
        
        // Spin the entire particle system slowly on Y axis
        if (this.particles && this.particles.points) {
            // Auto rotation is slowed down when hand is interactive
            const spinFactor = activeInteraction.active ? 0.05 : 0.25;
            this.particles.points.rotation.y += deltaTime * spinFactor;
        }

        // Update UI Panel telemetry
        if (this.ui) {
            this.ui.updateTelemetry(
                this.fps,
                activeInteraction.active ? activeInteraction.gesture : (this.mouseActive ? activeInteraction.gesture : 'None'),
                activeInteraction.handCount,
                activeInteraction.isPinching
            );
        }

        // Render scene
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Instantiate and start app on load
window.addEventListener('DOMContentLoaded', () => {
    const app = new ChronoSwarmApp();
    window.App = app;
    app.init();
});
