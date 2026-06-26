class ParticleSystemManager {
    constructor(scene, maxCount = 15000) {
        this.scene = scene;
        this.maxCount = maxCount;
        this.currentCount = 5000;
        this.particleSize = 0.18;
        this.morphSpeed = 0.04;
        this.activeTheme = 'bioluminescent';
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

        // Define color themes — entirely new palettes
        this.themes = {
            'bioluminescent': [
                new THREE.Color('#00ffc8'), // Bright Mint
                new THREE.Color('#00b4d8'), // Ocean Teal
                new THREE.Color('#9b5de5'), // Electric Violet
                new THREE.Color('#f72585')  // Vivid Magenta
            ],
            'volcanic': [
                new THREE.Color('#ff4500'), // Molten Orange
                new THREE.Color('#ff8c00'), // Deep Amber
                new THREE.Color('#ffd700'), // Liquid Gold
                new THREE.Color('#fff5cc')  // White Hot Core
            ],
            'deep-ocean': [
                new THREE.Color('#0a2342'), // Abyss Blue
                new THREE.Color('#1e6091'), // Deep Marine
                new THREE.Color('#48cae4'), // Luminous Aqua
                new THREE.Color('#ade8f4')  // Surface Shimmer
            ],
            'prismatic': [
                new THREE.Color('#ff006e'), // Hot Pink
                new THREE.Color('#fb5607'), // Tangerine
                new THREE.Color('#ffbe0b'), // Sunflower
                new THREE.Color('#06d6a0')  // Jade Green
            ],
            'moonstone': [
                new THREE.Color('#c9b1ff'), // Soft Lavender
                new THREE.Color('#ffd6e0'), // Blush Pink
                new THREE.Color('#bde0fe'), // Baby Blue
                new THREE.Color('#e2d1f9')  // Pale Violet
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
            case 'Galaxy':
                this.generateGalaxy(targets, count);
                break;
            case 'Tornado':
                this.generateTornado(targets, count);
                break;
            case 'DNA':
                this.generateDNA(targets, count);
                break;
            case 'Supernova':
                this.generateSupernova(targets, count);
                break;
            case 'Blackhole':
                this.generateBlackhole(targets, count);
                break;
            case 'Atom':
                this.generateAtom(targets, count);
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

    generateGalaxy(targets, count) {
        const arms = 4;
        const coreSplit = Math.floor(count * 0.25);
        const armSplit = Math.floor(count * 0.65);

        for (let i = 0; i < count; i++) {
            const idx = i * 3;

            if (i < coreSplit) {
                // Dense central bulge — concentrated spheroid
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const r = Math.pow(Math.random(), 0.5) * 2.0;

                targets[idx] = r * Math.sin(phi) * Math.cos(theta);
                targets[idx + 1] = r * Math.cos(phi) * 0.35;
                targets[idx + 2] = r * Math.sin(phi) * Math.sin(theta);
            } else if (i < coreSplit + armSplit) {
                // Logarithmic spiral arm particles
                const armIndex = i % arms;
                const armOffset = (armIndex / arms) * Math.PI * 2;
                const t = Math.random();
                const r = 2.0 + t * 8.5;

                const spiralAngle = armOffset + t * Math.PI * 3.5;
                const spread = t * 1.0;
                const offsetAngle = (Math.random() - 0.5) * spread;
                const angle = spiralAngle + offsetAngle;
                const y = (Math.random() - 0.5) * (0.2 + t * 0.4);

                targets[idx] = r * Math.cos(angle);
                targets[idx + 1] = y;
                targets[idx + 2] = r * Math.sin(angle);
            } else {
                // Sparse outer halo
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const r = 3.0 + Math.random() * 8.0;

                targets[idx] = r * Math.sin(phi) * Math.cos(theta) * 0.7;
                targets[idx + 1] = r * Math.cos(phi) * 0.15;
                targets[idx + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
            }
        }
    }

    generateTornado(targets, count) {
        const funnelSplit = Math.floor(count * 0.78);
        const debrisSplit = Math.floor(count * 0.12);

        for (let i = 0; i < count; i++) {
            const idx = i * 3;

            if (i < funnelSplit) {
                // Funnel vortex — narrow at bottom, wide at top
                const t = Math.random();
                const height = t * 16 - 8;

                const baseRadius = 0.25;
                const topRadius = 5.5;
                const radius = baseRadius + (topRadius - baseRadius) * Math.pow(t, 1.6);

                // Dense spiral winding — tighter at bottom
                const spiralTurns = 10 - t * 4;
                const angle = t * Math.PI * 2 * spiralTurns + (i * 0.618) % (Math.PI * 2);

                const thickness = 0.15 + t * 0.6;
                const rOffset = radius + (Math.random() - 0.5) * thickness;

                targets[idx] = rOffset * Math.cos(angle);
                targets[idx + 1] = height;
                targets[idx + 2] = rOffset * Math.sin(angle);
            } else if (i < funnelSplit + debrisSplit) {
                // Ground debris cloud
                const theta = Math.random() * Math.PI * 2;
                const r = Math.pow(Math.random(), 0.6) * 5;

                targets[idx] = r * Math.cos(theta) + (Math.random() - 0.5) * 1.5;
                targets[idx + 1] = -8 + Math.random() * 2.5;
                targets[idx + 2] = r * Math.sin(theta) + (Math.random() - 0.5) * 1.5;
            } else {
                // Upper dispersion cloud
                const theta = Math.random() * Math.PI * 2;
                const r = 3 + Math.random() * 5;

                targets[idx] = r * Math.cos(theta) + (Math.random() - 0.5) * 3;
                targets[idx + 1] = 6 + Math.random() * 4;
                targets[idx + 2] = r * Math.sin(theta) + (Math.random() - 0.5) * 3;
            }
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

    generateSupernova(targets, count) {
        const shellSplit = Math.floor(count * 0.45);
        const jetSplit = Math.floor(count * 0.25);
        // Remaining 30%: inner shockwave nebula

        for (let i = 0; i < count; i++) {
            const idx = i * 3;

            if (i < shellSplit) {
                // Expanding spherical shell with filamentary ripples
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const baseR = 7.5;

                const filament = Math.sin(theta * 6 + phi * 4) * 0.7
                               + Math.cos(theta * 3 - phi * 7) * 0.4;
                const r = baseR + filament + (Math.random() - 0.5) * 0.8;

                targets[idx] = r * Math.sin(phi) * Math.cos(theta);
                targets[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
                targets[idx + 2] = r * Math.cos(phi);
            } else if (i < shellSplit + jetSplit) {
                // Bipolar jets — twin beams erupting from the poles
                const isTop = Math.random() > 0.5;
                const direction = isTop ? 1 : -1;

                const t = Math.pow(Math.random(), 0.7);
                const jetLength = 11;
                const jetRadius = 0.4 + t * 1.8;

                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * jetRadius;

                targets[idx] = r * Math.cos(angle);
                targets[idx + 1] = r * Math.sin(angle);
                targets[idx + 2] = direction * (2.5 + t * jetLength);
            } else {
                // Inner shockwave nebula — dense toward center
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const r = Math.pow(Math.random(), 0.6) * 5;

                const warp = Math.sin(theta * 2) * 0.4;

                targets[idx] = r * Math.sin(phi) * Math.cos(theta) + warp;
                targets[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
                targets[idx + 2] = r * Math.cos(phi);
            }
        }
    }

    generateBlackhole(targets, count) {
        const diskSplit = Math.floor(count * 0.55);
        const photonSplit = Math.floor(count * 0.15);
        const jetSplit = Math.floor(count * 0.20);
        // Remaining 10%: Einstein ring / gravitational lensing halo

        for (let i = 0; i < count; i++) {
            const idx = i * 3;

            if (i < diskSplit) {
                // Accretion disk — spiraling matter with warp
                const t = Math.random();
                const r = 3.0 + t * 7.0;
                const theta = Math.random() * Math.PI * 2 + t * Math.PI * 4;

                const warpAngle = 0.35;
                const x = r * Math.cos(theta);
                const y = (Math.random() - 0.5) * (0.12 + t * 0.25);
                const z = r * Math.sin(theta);

                targets[idx] = x;
                targets[idx + 1] = y * Math.cos(warpAngle) - z * Math.sin(warpAngle) * 0.12;
                targets[idx + 2] = z * Math.cos(warpAngle) + y * Math.sin(warpAngle);
            } else if (i < diskSplit + photonSplit) {
                // Photon sphere — bright dense ring at event horizon edge
                const theta = Math.random() * Math.PI * 2;
                const r = 2.6 + (Math.random() - 0.5) * 0.5;
                const y = (Math.random() - 0.5) * 0.25;

                targets[idx] = r * Math.cos(theta);
                targets[idx + 1] = y;
                targets[idx + 2] = r * Math.sin(theta);
            } else if (i < diskSplit + photonSplit + jetSplit) {
                // Relativistic jets — narrow twin beams from poles
                const isTop = Math.random() > 0.5;
                const direction = isTop ? 1 : -1;
                const t = Math.pow(Math.random(), 0.5);

                const jetLength = 13;
                const jetRadius = 0.15 + t * 0.7;
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * jetRadius;

                targets[idx] = r * Math.cos(angle);
                targets[idx + 1] = direction * (1.5 + t * jetLength);
                targets[idx + 2] = r * Math.sin(angle);
            } else {
                // Einstein ring — gravitational lensing sphere
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const r = 2.4 + (Math.random() - 0.5) * 0.35;

                targets[idx] = r * Math.sin(phi) * Math.cos(theta);
                targets[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
                targets[idx + 2] = r * Math.cos(phi);
            }
        }
    }

    generateAtom(targets, count) {
        const nucleusSplit = Math.floor(count * 0.18);
        const orbits = 3;

        for (let i = 0; i < count; i++) {
            const idx = i * 3;

            if (i < nucleusSplit) {
                // Nucleus — dense proton/neutron cluster
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const r = Math.pow(Math.random(), 0.4) * 1.5;

                targets[idx] = r * Math.sin(phi) * Math.cos(theta);
                targets[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
                targets[idx + 2] = r * Math.cos(phi);
            } else {
                // Electron orbital rings — 3 ellipses at 60° tilts
                const orbitIdx = (i - nucleusSplit) % orbits;
                const semiMajor = 7.0;
                const semiMinor = 3.2;
                const theta = Math.random() * Math.PI * 2;

                const tubeR = 0.18 + Math.random() * 0.22;
                const tubeAngle = Math.random() * Math.PI * 2;

                let x = (semiMajor + tubeR * Math.cos(tubeAngle)) * Math.cos(theta);
                let y = (semiMinor + tubeR * Math.cos(tubeAngle)) * Math.sin(theta);
                let z = tubeR * Math.sin(tubeAngle);

                // Rotate each orbit 60° apart around Y axis
                const rotAngle = (orbitIdx / orbits) * Math.PI;
                const nx = x * Math.cos(rotAngle) + z * Math.sin(rotAngle);
                const nz = -x * Math.sin(rotAngle) + z * Math.cos(rotAngle);

                targets[idx] = nx;
                targets[idx + 1] = y;
                targets[idx + 2] = nz;
            }
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
            } else if (this.activeShape === 'Galaxy') {
                // Spiral arm gradient with angular hue shift
                const angle = Math.atan2(tz, tx);
                t = Math.min(1.0, dist / 10.0) * 0.7 + Math.sin(angle * 2) * 0.15 + 0.15;
            } else if (this.activeShape === 'Tornado') {
                // Ground-to-sky height gradient
                t = (ty + 8) / 16;
            } else if (this.activeShape === 'Supernova') {
                // Radial explosion gradient: core bright, shell edge
                t = Math.min(1.0, dist / 12.0);
            } else if (this.activeShape === 'Blackhole') {
                // Accretion disk: bright inner edge fading outward
                t = 1.0 - Math.min(1.0, dist / 11.0);
            } else if (this.activeShape === 'Atom') {
                // Nucleus glows distinct from orbital rings
                t = i < (count * 0.18) ? 0.1 : Math.min(1.0, dist / 8.0);
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

            // Special shape-specific drift animations
            if (this.activeShape === 'Tornado' && !(handData.active && handData.isPinching)) {
                // Upward spiral drift
                py += 0.005;
                const rad = Math.sqrt(px * px + pz * pz);
                if (rad > 0.1) {
                    const angle = Math.atan2(pz, px);
                    px += Math.cos(angle + Math.PI / 2) * 0.012;
                    pz += Math.sin(angle + Math.PI / 2) * 0.012;
                }
            } else if (this.activeShape === 'Supernova' && !(handData.active && handData.isPinching)) {
                // Slow radial expansion pulsation
                const rad = Math.sqrt(px * px + py * py + pz * pz);
                if (rad > 0.1) {
                    px += (px / rad) * 0.002;
                    py += (py / rad) * 0.002;
                    pz += (pz / rad) * 0.002;
                }
            } else if (this.activeShape === 'Blackhole' && !(handData.active && handData.isPinching)) {
                // Slow inward spiral around the singularity
                const rad = Math.sqrt(px * px + pz * pz);
                if (rad > 0.3) {
                    const angle = Math.atan2(pz, px);
                    px += Math.cos(angle + Math.PI / 2) * 0.015;
                    pz += Math.sin(angle + Math.PI / 2) * 0.015;
                    px -= (px / rad) * 0.001;
                    pz -= (pz / rad) * 0.001;
                }
            } else if (this.activeShape === 'Atom' && !(handData.active && handData.isPinching)) {
                // Electron orbital rotation
                const rad = Math.sqrt(px * px + py * py + pz * pz);
                if (rad > 2.0) {
                    const angle = Math.atan2(pz, px);
                    px += Math.cos(angle + Math.PI / 2) * 0.008;
                    pz += Math.sin(angle + Math.PI / 2) * 0.008;
                }
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
