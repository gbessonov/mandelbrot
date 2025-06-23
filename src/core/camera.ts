export class Camera {
    public _x: number;
    public _y: number;
    private _zoom: number;

    constructor(x = 0, y = 0, zoom = 1) {
        this._x = x;
        this._y = y;
        this._zoom = zoom;
    }

    get zoom() {
        return this._zoom;
    }

    set zoom(zoom: number) {
        const oldZoom = this._zoom;
        this._zoom = zoom;
        this.x = this.x * zoom / oldZoom;
        this.y = this.y * zoom / oldZoom;
    }

    get x() {
        return this._x;
    }

    set x(value: number) {
        this._x = value;
    }

    get y() {
        return this._y;
    }

    set y(value: number) {
        this._y = value;
    }

    static ZOOM_SPEED = 1.1;

    applyPan(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    applyZoom(amount: number, centerX: number, centerY: number) {
        if (amount === 0) return;

        if (amount > 0) {
            this._zoom *= Camera.ZOOM_SPEED;
            const k = Camera.ZOOM_SPEED - 1;
            this.x -= k * centerX;
            this.y += k * centerY;
        } else {
            this._zoom /= Camera.ZOOM_SPEED;
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
