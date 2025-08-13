import { math, MOUSEBUTTON_LEFT, MOUSEBUTTON_RIGHT, Script, Vec3 } from "playcanvas";

export // Define Orbit Camera Script using class syntax
class OrbitCamera extends Script {
    static get scriptName() {
        return 'orbitCamera';
    }

    static attributes = {
        orbitSensitivity: { type: 'number', default: 0.3, title: 'Orbit Sensitivity' },
        zoomSensitivity: { type: 'number', default: 0.2, title: 'Zoom Sensitivity' },
        panSensitivity: { type: 'number', default: 0.3, title: 'Pan Sensitivity' },
        minDistance: { type: 'number', default: 1, title: 'Min Distance' },
        maxDistance: { type: 'number', default: 100, title: 'Max Distance' },
        minPitch: { type: 'number', default: -90, title: 'Min Pitch (degrees)' },
        maxPitch: { type: 'number', default: 90, title: 'Max Pitch (degrees)' }
    };

    initialize() {
        this.distance = 10;
        this.pitch = 0;
        this.yaw = 0;
        this.pivotPoint = new Vec3(0, 0, 0);

        // Initialize camera position based on current lookAt
        const lookAtPos = new Vec3(4.376051060512836, -0.7526616755988405, -15.951593063115695);
        this.pivotPoint.copy(lookAtPos);
        const cameraPos = this.entity.getPosition();
        this.distance = cameraPos.distance(lookAtPos);
        this.yaw = Math.atan2(cameraPos.x - lookAtPos.x, cameraPos.z - lookAtPos.z) * pc.math.RAD_TO_DEG;
        this.pitch = -Math.asin((cameraPos.y - lookAtPos.y) / this.distance) * pc.math.RAD_TO_DEG;

        // Input handling
        this.app.mouse.on('mousedown', this.onMouseDown, this);
        this.app.mouse.on('mousemove', this.onMouseMove, this);
        this.app.mouse.on('mousewheel', this.onMouseWheel, this);

        // Enable mouse events
        this.app.mouse.enablePointerLock();
        this.updateCamera();
    }

    update(dt) {
        this.updateCamera();
    }

    onMouseDown(event) {
        if (event.button === MOUSEBUTTON_LEFT || event.button === MOUSEBUTTON_RIGHT) {
            this.app.mouse.enablePointerLock();
        }
    }

    onMouseMove(event) {
        if (this.app.mouse.isPointerLocked()) {
            if (event.buttons[MOUSEBUTTON_LEFT]) {
                // Orbit: Left mouse button
                this.yaw -= event.dx * this.orbitSensitivity;
                this.pitch -= event.dy * this.orbitSensitivity;
                this.pitch = math.clamp(this.pitch, this.minPitch, this.maxPitch);
            } else if (event.buttons[MOUSEBUTTON_RIGHT]) {
                // Pan: Right mouse button
                const right = this.entity.right;
                const up = this.entity.up;
                this.pivotPoint.sub(right.scale(event.dx * this.panSensitivity * 0.01));
                this.pivotPoint.sub(up.scale(event.dy * this.panSensitivity * 0.01));
            }
        }
    }

    onMouseWheel(event) {
        this.distance -= event.wheel * this.zoomSensitivity;
        this.distance = math.clamp(this.distance, this.minDistance, this.maxDistance);
    }

    updateCamera() {
        const x = this.distance * Math.sin(this.yaw * math.DEG_TO_RAD) * Math.cos(this.pitch * math.DEG_TO_RAD);
        const z = this.distance * Math.cos(this.yaw * math.DEG_TO_RAD) * Math.cos(this.pitch * math.DEG_TO_RAD);
        const y = this.distance * Math.sin(this.pitch * math.DEG_TO_RAD);

        const cameraPos = new Vec3(this.pivotPoint.x + x, this.pivotPoint.y + y, this.pivotPoint.z + z);
        this.entity.setPosition(cameraPos);
        this.entity.lookAt(this.pivotPoint);
    }
}