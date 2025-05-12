export class Camera {
    public x: number;
    public y: number;
    public zoomLog: number;

    constructor(x = 0, y = 0, zoomLog = 0) {
        this.x = x;
        this.y = y;
        this.zoomLog = zoomLog;
    }

    get zoom(): number {
        return Math.pow(Camera.ZOOM_SPEED, this.zoomLog);
    }

    static ZOOM_SPEED = 1.1;

    applyPan(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    applyZoom(amount: number, centerX: number, centerY: number) {
        if (amount === 0) return;

        if (amount > 0) {
            this.zoomLog++;
            const k = Camera.ZOOM_SPEED - 1;
            this.x -= k * centerX;
            this.y += k * centerY;
        } else {
            this.zoomLog--;
            const k = 1 - 1 / Camera.ZOOM_SPEED;
            this.x += k * centerX;
            this.y -= k * centerY;
        }
    }

    static getTouchDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static getTouchMidpoint(touches: TouchList): { x: number; y: number } {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    }
}