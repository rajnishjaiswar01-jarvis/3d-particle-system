class ParticleSystemManager {
    constructor(scene, maxCount = 15000) {
        this.scene = scene;
        this.maxCount = maxCount;
        this.currentCount = 5000;
        this.particleSize = 0.18;
        this.morphSpeed = 0.04;
        this.activeTheme = 'cosmic';
        this.activeShape = 'Saturn';
        
        // Physics and turbulence parameters
        this.gravityStrength = 0.8;
        this.turbulenceStrength = 0.4;
        
        // Particle state buffers
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxCount * 3);
        this.targetPositions = new Float32Array(this.maxCount * 3);
        this.colors = new Float32Array(this.maxCount * 3);
        this.velocities = new Float32Array(this.maxCount * 3); // For explosions/physics drift
        
        // Initialize particle positions randomly in a sphere
        for (let i = 0; i < this.maxCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = Math.random() * 5;
            
            this.positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            this.positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            this.positions[i * 3 + 2] = r * Math.cos(phi);
            
            this.velocities[i * 3] = 0;
            this.velocities[i * 3 + 1] = 0;
            this.velocities[i * 3 + 2] = 0;
        }

        // Setup geometry attributes
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setDrawRange(0, this.currentCount);
        
        // Generate particle texture and material
        this.texture = this.createParticleTexture();
        this.material = new THREE.PointsMaterial({
            size: this.particleSize,
            map: this.texture,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.85
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);

        // Define color themes
        this.themes = {
            cosmic: [
                new THREE.Color('#4c00ff'), // Deep Indigo
                new THREE.Color('#00ffff'), // Cyan
                new THREE.Color('#ff00aa'), // Magenta
                new THREE.Color('#ffaa00')  // Amber Gold
            ],
            synthwave: [
                new THREE.Color('#ff0055'), // Hot Pink
                new THREE.Color('#7a00ff'), // Purple Neon
                new THREE.Color('#00e1ff'), // Electric Blue
                new THREE.Color('#ffdd00')  // Sun Yellow
            ],
            solar: [
                new THREE.Color('#ff2200'), // Intense Red
                new THREE.Color('#ff7700'), // Orange
                new THREE.Color('#ffdd00'), // Gold Yellow
                new THREE.Color('#ffeedd')  // Solar White
            ],
            aurora: [
                new THREE.Color('#00ffaa'), // Neon Green
                new THREE.Color('#00ffd5'), // Mint Teal
                new THREE.Color('#0088ff'), // Deep Blue
                new THREE.Color('#7a00ff')  // Violet Aurora
            ],
            'fire-ice': [
                new THREE.Color('#ff4400'), // Fiery Orange
                new THREE.Color('#ffaa00'), // Fire Yellow
                new THREE.Color('#00aaff'), // Ice Blue
                new THREE.Color('#aaddff')  // White Frost
            ]
        };

        // Initialize targets and colors
        this.generateShape(this.activeShape);
        this.updateColors();
        
        // Interaction memory
        this.wasPinching = false;
    }

    // Dynamic texture generation
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        return new THREE.CanvasTexture(canvas);
    }

    // Update settings from dashboard
    updateSettings(settings) {
        if (settings.particleSize !== undefined) {
            this.particleSize = settings.particleSize;
            this.material.size = this.particleSize;
        }
        if (settings.particleCount !== undefined) {
            this.currentCount = Math.min(settings.particleCount, this.maxCount);
            this.geometry.setDrawRange(0, this.currentCount);
            // Re-generate current shape for the new count boundaries
            this.generateShape(this.activeShape);
            this.updateColors();
        }
        if (settings.morphSpeed !== undefined) {
            this.morphSpeed = settings.morphSpeed;
        }
        if (settings.gravity !== undefined) {
            this.gravityStrength = settings.gravity;
        }
        if (settings.turbulence !== undefined) {
            this.turbulenceStrength = settings.turbulence;
        }
        if (settings.theme !== undefined && this.activeTheme !== settings.theme) {
            this.activeTheme = settings.theme;
            this.updateColors();
        }
    }

    // Trigger shape change
    morphTo(shapeName) {
        if (this.activeShape === shapeName) return;
        this.activeShape = shapeName;
        this.generateShape(shapeName);
        this.updateColors();
        
        // Visual updates in dashboard via UI callback
        if (window.UI) {
            window.UI.setActiveShapeButton(shapeName);
        }
    }

    // Map mathematical coordinates to target positions
    generateShape(shapeName) {
        const count = this.maxCount;
        const targets = this.targetPositions;

        switch (shapeName) {
            case 'Saturn':
                this.generateSaturn(targets, count);
                break;
            case 'Heart':
                this.generateHeart(targets, count);
                break;
            case 'Flower':
                this.generateFlower(targets, count);
                break;
            case 'Torus':
                this.generateTorus(targets, count);
                break;
            case 'DNA':
                this.generateDNA(targets, count);
                break;
            case 'Fireworks':
                this.generateFireworks(targets, count);
                break;
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }

    // Mathematical Templates
    generateSaturn(targets, count) {
        const sphereSplit = Math.floor(count * 0.45); // 45% sphere, 55% rings
        
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            if (i < sphereSplit) {
                // Sphere (Planet body)
                const u = Math.random();
                const v = Math.random();
                const theta = u * Math.PI * 2;
                const phi = Math.acos(2 * v - 1);
                const r = 4.2 + (Math.random() - 0.5) * 0.15; // slightly fuzzy sphere surface
                
                targets[idx] = r * Math.sin(phi) * Math.cos(theta);
                targets[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
                targets[idx + 2] = r * Math.cos(phi);
            } else {
                // Flat Ring surrounding sphere
                const theta = Math.random() * Math.PI * 2;
                const r = 6.2 + Math.random() * 4.8; // ring boundaries (6.2 to 11)
                const tilt = 0.48; // ~28 degrees tilt angle
                
                const rx = r * Math.cos(theta);
                const ry = r * Math.sin(theta);
                const rz = (Math.random() - 0.5) * 0.25; // small vertical thickness
                
                // Rotate around X axis for tilt
                targets[idx] = rx;
                targets[idx + 1] = ry * Math.cos(tilt) - rz * Math.sin(tilt);
                targets[idx + 2] = ry * Math.sin(tilt) + rz * Math.cos(tilt);
            }
        }
    }

    generateHeart(targets, count) {
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            const t = Math.random() * Math.PI * 2;
            
            // Standard heart parametric equation scaled
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            
            // volumetric scaling (make it 3D by thickening center, thinning out at edges)
            const thicknessScale = 1.0 - Math.abs(x) / 16.0;
            const z = (Math.random() - 0.5) * 8 * thicknessScale;
            
            // Scale and center the heart in the viewport
            targets[idx] = x * 0.45;
            targets[idx + 1] = y * 0.45 + 1.0; // lift heart slightly
            targets[idx + 2] = z * 0.45;
        }
    }

    generateFlower(targets, count) {
        const petals = 6;
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            // Sunflower packing spiral (Fermat's spiral)
            const angle = i * 137.5 * Math.PI / 180;
            const r = Math.sqrt(i) / Math.sqrt(count) * 9; // radius out to 9 units
            
            // Wave mapping for petals structure
            const petalIntensity = Math.sin(angle * petals) * 1.5;
            // Add a wavy height profile in Z
            const z = petalIntensity * (r / 9.0) * 1.2 + (Math.random() - 0.5) * 0.4;
            
            // Expand radius slightly at peak of petals
            const modR = r + (petalIntensity > 0 ? petalIntensity * 0.3 : 0);

            targets[idx] = modR * Math.cos(angle);
            targets[idx + 1] = modR * Math.sin(angle);
            targets[idx + 2] = z;
        }
    }

    generateTorus(targets, count) {
        const p = 3; // winding number
        const q = 7; // winding number
        
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            const t = (i / count) * Math.PI * 2 * p; // loop around
            
            // Knot path coordinates
            const rKnot = 1.6 * (2.0 + Math.cos(q * t / p));
            const xKnot = rKnot * Math.cos(t);
            const yKnot = rKnot * Math.sin(t);
            const zKnot = rKnot * Math.sin(q * t / p) * 0.5;

            // Make it a thick tube by adding radial cylinder offsets
            const u = Math.random() * Math.PI * 2;
            const tubeRadius = 0.6 + Math.random() * 0.8;
            
            targets[idx] = xKnot + Math.cos(u) * tubeRadius;
            targets[idx + 1] = yKnot + Math.sin(u) * tubeRadius;
            targets[idx + 2] = zKnot + (Math.random() - 0.5) * tubeRadius;
        }
    }

    generateDNA(targets, count) {
        const strandSplit = Math.floor(count * 0.40); // 40% strand A, 40% strand B, 20% connections
        const pitch = 0.25; // helices spacing
        
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            
            if (i < strandSplit) {
                // Strand A
                const t = (i / strandSplit) * Math.PI * 6; // 3 full turns
                const r = 3.6;
                targets[idx] = r * Math.cos(t) + (Math.random() - 0.5) * 0.3;
                targets[idx + 1] = r * Math.sin(t) + (Math.random() - 0.5) * 0.3;
                targets[idx + 2] = (t - Math.PI * 3) * 1.5;
            } else if (i < strandSplit * 2) {
                // Strand B (opposite phase by PI radians)
                const t = ((i - strandSplit) / strandSplit) * Math.PI * 6;
                const r = 3.6;
                targets[idx] = -r * Math.cos(t) + (Math.random() - 0.5) * 0.3;
                targets[idx + 1] = -r * Math.sin(t) + (Math.random() - 0.5) * 0.3;
                targets[idx + 2] = (t - Math.PI * 3) * 1.5;
            } else {
                // Connecting rungs
                const connectionCount = count - (strandSplit * 2);
                const progress = (i - (strandSplit * 2)) / connectionCount;
                
                // Snap to discrete intervals along helices length
                const ringsCount = 24;
                const ringIndex = Math.floor(progress * ringsCount);
                const tSnap = (ringIndex / ringsCount) * Math.PI * 6;
                
                // Interpolate along the chord
                const pct = Math.random();
                const r = 3.6;
                
                const ax = r * Math.cos(tSnap);
                const ay = r * Math.sin(tSnap);
                const bx = -r * Math.cos(tSnap);
                const by = -r * Math.sin(tSnap);
                
                targets[idx] = ax + (bx - ax) * pct + (Math.random() - 0.5) * 0.2;
                targets[idx + 1] = ay + (by - ay) * pct + (Math.random() - 0.5) * 0.2;
                targets[idx + 2] = (tSnap - Math.PI * 3) * 1.5 + (Math.random() - 0.5) * 0.2;
            }
        }
    }

    generateFireworks(targets, count) {
        // Multi-point fireworks nodes
        const numCenters = 5;
        const centers = [];
        for (let c = 0; c < numCenters; c++) {
            centers.push({
                x: (Math.random() - 0.5) * 12,
                y: (Math.random() - 0.5) * 6 + 3,
                z: (Math.random() - 0.5) * 8,
                radius: 3 + Math.random() * 4
            });
        }

        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            // Distribute particles among centers
            const centerIdx = i % numCenters;
            const c = centers[centerIdx];
            
            // Random direction in sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = Math.random() * c.radius;
            
            targets[idx] = c.x + r * Math.sin(phi) * Math.cos(theta);
            targets[idx + 1] = c.y + r * Math.sin(phi) * Math.sin(theta);
            targets[idx + 2] = c.z + r * Math.cos(phi);
        }
    }

    // Apply color palette gradients to buffer
    updateColors() {
        const count = this.maxCount;
        const colors = this.colors;
        const targets = this.targetPositions;
        const theme = this.themes[this.activeTheme];

        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            
            // Calculate height index or radius from origin to drive colors
            const tx = targets[idx];
            const ty = targets[idx + 1];
            const tz = targets[idx + 2];
            const dist = Math.sqrt(tx*tx + ty*ty + tz*tz);
            
            // Map distance / geometry to normalized 0-1 range
            let t = 0;
            if (this.activeShape === 'Saturn') {
                // Body is one color, rings another
                t = i > (count * 0.45) ? (dist / 11.0) : 0.1;
            } else if (this.activeShape === 'DNA') {
                // Strand color gradient based on helical height Z
                t = (tz + 15) / 30;
            } else {
                // Radial gradient based on bounds
                t = Math.min(1.0, dist / 10.0);
            }

            // Interpolate color values across theme palette
            // We have 4 colors in each theme array, map t (0-1) to indices
            const colorVal = this.getPaletteColor(t, theme);
            
            colors[idx] = colorVal.r;
            colors[idx + 1] = colorVal.g;
            colors[idx + 2] = colorVal.b;
        }

        this.geometry.attributes.color.needsUpdate = true;
    }

    getPaletteColor(t, palette) {
        // Clamp t
        t = Math.max(0, Math.min(1, t));
        
        // Find segment
        const scale = t * (palette.length - 1);
        const index = Math.floor(scale);
        const fract = scale - index;
        
        const c1 = palette[index];
        const c2 = palette[Math.min(index + 1, palette.length - 1)];
        
        return new THREE.Color().copy(c1).lerp(c2, fract);
    }

    // Trigger explosive shockwave outward from hand coordinate
    triggerExplosion(handX, handY, handZ) {
        const count = this.currentCount;
        const positions = this.positions;
        const velocities = this.velocities;
        
        const force = 1.6;

        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            const px = positions[idx];
            const py = positions[idx + 1];
            const pz = positions[idx + 2];
            
            // Vector pointing away from explosion center
            let dx = px - handX;
            let dy = py - handY;
            let dz = pz - handZ;
            
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.1;
            
            // Add massive outward push, randomized per particle for aesthetic expansion
            const rFactor = 0.6 + Math.random() * 1.5;
            const radialPush = (force / (dist * 0.1 + 0.5)) * rFactor;
            
            velocities[idx] += (dx / dist) * radialPush;
            velocities[idx + 1] += (dy / dist) * radialPush;
            velocities[idx + 2] += (dz / dist) * radialPush;
        }
    }

    // Core Animation Update Loop
    update(deltaTime, time, handData) {
        const count = this.currentCount;
        const positions = this.positions;
        const targets = this.targetPositions;
        const velocities = this.velocities;
        
        // Listen for pinch-release trigger
        if (handData.active && handData.isPinching) {
            this.wasPinching = true;
        } else if (this.wasPinching) {
            // Explode particles when pinch is released
            this.triggerExplosion(handData.x, handData.y, handData.z);
            this.wasPinching = false;
        }

        // Apply physical movements to all particles
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            let px = positions[idx];
            let py = positions[idx + 1];
            let pz = positions[idx + 2];

            let tx = targets[idx];
            let ty = targets[idx + 1];
            let tz = targets[idx + 2];

            // 1. Pinch Contraction effect
            // If hand is pinching, drag ALL target locations to the hand coordinate
            if (handData.active && handData.isPinching) {
                // Interpolate target towards hand coordinate based on pinch strength
                const strength = handData.pinchStrength;
                tx = tx + (handData.x - tx) * strength;
                ty = ty + (handData.y - ty) * strength;
                tz = tz + (handData.z - tz) * strength;
            }

            // 2. Morphing force pulling particles to targets
            let morphForceX = (tx - px) * this.morphSpeed;
            let morphForceY = (ty - py) * this.morphSpeed;
            let morphForceZ = (tz - pz) * this.morphSpeed;

            // 3. Gravity Interaction Vortex
            // Pull particles towards hand coordinates and spin them
            let gravityForceX = 0;
            let gravityForceY = 0;
            let gravityForceZ = 0;
            
            if (handData.active && !handData.isPinching) {
                const dx = handData.x - px;
                const dy = handData.y - py;
                const dz = handData.z - pz;
                
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.1;
                
                // Pull scaling
                const pull = this.gravityStrength * 0.15 / (dist * 0.05 + 0.6);
                
                // Swirl orbit force (spinning around the hand core vector)
                const orbitSpeed = 0.12 * this.gravityStrength;
                const orbitX = -dy / dist * orbitSpeed;
                const orbitY = dx / dist * orbitSpeed;
                
                gravityForceX = (dx / dist) * pull + orbitX;
                gravityForceY = (dy / dist) * pull + orbitY;
                gravityForceZ = (dz / dist) * pull;
            }

            // 4. Turbulence/Noise (Sinusoidal waves to mock Perlin noise flow)
            let noiseX = 0;
            let noiseY = 0;
            let noiseZ = 0;
            
            if (this.turbulenceStrength > 0) {
                const noiseFreq = 0.5;
                const noiseSpeed = 2.0;
                
                noiseX = Math.sin(py * noiseFreq + time * noiseSpeed) * 0.08 * this.turbulenceStrength;
                noiseY = Math.cos(px * noiseFreq + time * noiseSpeed) * 0.08 * this.turbulenceStrength;
                noiseZ = Math.sin(pz * noiseFreq + time * noiseSpeed) * 0.08 * this.turbulenceStrength;
            }

            // 5. Apply velocities (residual blast decay)
            px += velocities[idx];
            py += velocities[idx + 1];
            pz += velocities[idx + 2];
            
            // Damp velocities
            velocities[idx] *= 0.94;
            velocities[idx + 1] *= 0.94;
            velocities[idx + 2] *= 0.94;

            // Special Fireworks drift (slow falling effect if Fireworks shape is active and not pinching)
            if (this.activeShape === 'Fireworks' && !(handData.active && handData.isPinching)) {
                py -= 0.008; // slow drift downward
            }

            // Add up all updates to current coordinates
            positions[idx] = px + morphForceX + gravityForceX + noiseX;
            positions[idx + 1] = py + morphForceY + gravityForceY + noiseY;
            positions[idx + 2] = pz + morphForceZ + gravityForceZ + noiseZ;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}
window.ParticleSystemManager = ParticleSystemManager;
