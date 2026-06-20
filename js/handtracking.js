class HandTracker {
    constructor() {
        this.hands = null;
        this.videoElement = document.getElementById('webcam');
        this.canvasElement = document.getElementById('hand-canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');
        this.isTracking = false;
        this.frameSkip = 0;
        this.animFrameId = null;

        this.handData = {
            active: false,
            x: 0, y: 0, z: 0,
            gesture: 'None',
            fingerCount: -1,
            isPinching: false,
            pinchStrength: 0,
            handCount: 0,
            speed: 0,
            rotation: 0
        };

        this.prevPosition = { x: 0, y: 0 };
        this.onResultsCallback = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            try {
                this.hands = new Hands({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                    }
                });
                this.hands.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 0,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                this.hands.onResults((results) => this.onResults(results));
                console.log('[HandTracker] MediaPipe Hands initialized.');
                resolve();
            } catch (err) {
                console.error('[HandTracker] Init failed:', err);
                reject(err);
            }
        });
    }

    startCamera() {
        if (this.isTracking) return Promise.resolve();

        const loadingEl = document.getElementById('cam-loading');
        const placeholderEl = document.getElementById('cam-placeholder');

        // Show loading, hide placeholder using INLINE styles (cache-proof)
        loadingEl.style.display = 'flex';
        placeholderEl.style.display = 'none';

        return navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        })
        .then((stream) => {
            this.videoElement.srcObject = stream;
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });
        })
        .then(() => {
            this.isTracking = true;
            // Hide loading overlay
            loadingEl.style.display = 'none';
            placeholderEl.style.display = 'none';

            console.log('[HandTracker] Camera started, beginning frame loop.');
            // Start sending frames to MediaPipe
            this._sendFrame();
            return Promise.resolve();
        })
        .catch((err) => {
            console.error('[HandTracker] Camera start failed:', err);
            loadingEl.style.display = 'none';
            placeholderEl.style.display = 'flex';
            return Promise.reject(err);
        });
    }

    _sendFrame() {
        if (!this.isTracking) return;
        // Only process every 3rd frame to reduce CPU load
        this.frameSkip++;
        if (this.frameSkip < 3) {
            this.animFrameId = requestAnimationFrame(() => this._sendFrame());
            return;
        }
        this.frameSkip = 0;

        if (this.videoElement.readyState >= 2 && this.hands) {
            this.hands.send({ image: this.videoElement }).then(() => {
                this.animFrameId = requestAnimationFrame(() => this._sendFrame());
            }).catch(() => {
                this.animFrameId = requestAnimationFrame(() => this._sendFrame());
            });
        } else {
            this.animFrameId = requestAnimationFrame(() => this._sendFrame());
        }
    }

    stopCamera() {
        this.isTracking = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(t => t.stop());
            this.videoElement.srcObject = null;
        }
        this.handData.active = false;
        this.handData.handCount = 0;
        this.handData.gesture = 'None';
        this.handData.fingerCount = -1;
        this.handData.isPinching = false;
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        const placeholderEl = document.getElementById('cam-placeholder');
        placeholderEl.style.display = 'flex';
    }

    setResultsCallback(cb) {
        this.onResultsCallback = cb;
    }

    onResults(results) {
        if (!this.isTracking) return;

        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        const drawOverlay = document.getElementById('check-draw-landmarks').checked;
        const handCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
        this.handData.handCount = handCount;

        if (handCount > 0) {
            this.handData.active = true;
            const landmarks = results.multiHandLandmarks[0];

            if (drawOverlay) {
                this.drawHandOverlay(landmarks);
            }

            const indexKnuckle = landmarks[9];
            const mappedX = (indexKnuckle.x - 0.5) * 30;
            const mappedY = -(indexKnuckle.y - 0.5) * 22;

            const wrist = landmarks[0];
            const handSize = this.getDistance(wrist, indexKnuckle);
            const sizePct = Math.max(0, Math.min(1, (handSize - 0.08) / (0.24 - 0.08)));
            const mappedZ = (sizePct - 0.5) * 30;

            const dx = mappedX - this.prevPosition.x;
            const dy = mappedY - this.prevPosition.y;
            this.handData.speed = Math.sqrt(dx * dx + dy * dy);

            this.handData.x = mappedX;
            this.handData.y = mappedY;
            this.handData.z = mappedZ;
            this.prevPosition.x = mappedX;
            this.prevPosition.y = mappedY;

            this.processGesture(landmarks);
        } else {
            this.handData.active = false;
            this.handData.gesture = 'None';
            this.handData.fingerCount = -1;
            this.handData.isPinching = false;
        }

        if (this.onResultsCallback) {
            this.onResultsCallback(this.handData);
        }
    }

    processGesture(landmarks) {
        const wrist = landmarks[0];

        const isIndexExtended = this.getDistance(landmarks[8], wrist) > this.getDistance(landmarks[6], wrist) * 1.05;
        const isMiddleExtended = this.getDistance(landmarks[12], wrist) > this.getDistance(landmarks[10], wrist) * 1.05;
        const isRingExtended = this.getDistance(landmarks[16], wrist) > this.getDistance(landmarks[14], wrist) * 1.05;
        const isPinkyExtended = this.getDistance(landmarks[20], wrist) > this.getDistance(landmarks[18], wrist) * 1.05;
        const isThumbExtended = this.getDistance(landmarks[4], landmarks[5]) > 0.07 && this.getDistance(landmarks[4], wrist) > this.getDistance(landmarks[2], wrist);

        let extendedCount = 0;
        if (isThumbExtended) extendedCount++;
        if (isIndexExtended) extendedCount++;
        if (isMiddleExtended) extendedCount++;
        if (isRingExtended) extendedCount++;
        if (isPinkyExtended) extendedCount++;

        this.handData.fingerCount = extendedCount;

        const handScale = this.getDistance(wrist, landmarks[9]);
        const pinchDistance = this.getDistance(landmarks[4], landmarks[8]);
        const pinchRatio = pinchDistance / handScale;
        const pinchThreshold = 0.26;

        if (pinchRatio < pinchThreshold) {
            this.handData.isPinching = true;
            this.handData.pinchStrength = Math.max(0, Math.min(1, 1 - (pinchRatio / pinchThreshold)));
        } else {
            this.handData.isPinching = false;
            this.handData.pinchStrength = 0;
        }

        if (extendedCount === 0) {
            this.handData.gesture = 'Fist';
        } else if (extendedCount === 1 && isIndexExtended) {
            this.handData.gesture = 'Index Point';
        } else if (extendedCount === 2 && isIndexExtended && isMiddleExtended) {
            this.handData.gesture = 'Peace Sign';
        } else if (extendedCount === 3 && isIndexExtended && isMiddleExtended && isRingExtended) {
            this.handData.gesture = 'Three Fingers';
        } else if (extendedCount === 4 && !isThumbExtended) {
            this.handData.gesture = 'Four Fingers';
        } else if (extendedCount === 5) {
            this.handData.gesture = 'Open Palm';
        } else {
            const gestureMap = ['Fist', 'Index Point', 'Peace Sign', 'Three Fingers', 'Four Fingers', 'Open Palm'];
            this.handData.gesture = gestureMap[extendedCount] || 'Open Palm';
        }

        const dxr = landmarks[9].x - landmarks[0].x;
        const dyr = landmarks[9].y - landmarks[0].y;
        this.handData.rotation = Math.atan2(dyr, dxr) + Math.PI / 2;
    }

    getDistance(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
    }

    drawHandOverlay(landmarks) {
        const ctx = this.canvasCtx;
        const width = this.canvasElement.width;
        const height = this.canvasElement.height;

        ctx.strokeStyle = '#00c3ff';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#ff3c6d';

        const toCanvas = (point) => ({
            x: point.x * width,
            y: point.y * height
        });

        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [9, 10], [10, 11], [11, 12],
            [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];

        ctx.beginPath();
        connections.forEach(([i, j]) => {
            const p1 = toCanvas(landmarks[i]);
            const p2 = toCanvas(landmarks[j]);
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
        });
        ctx.stroke();

        landmarks.forEach((point) => {
            const p = toCanvas(point);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        ctx.fillStyle = '#3effa2';
        [4, 8, 12, 16, 20].forEach((tipIdx) => {
            const p = toCanvas(landmarks[tipIdx]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4.5, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
}
window.HandTracker = HandTracker;
