import {type RefObject, useEffect} from 'react';

import {Camera} from "../core/camera.ts";

interface MouseControlOptions {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    cameraRef: RefObject<Camera>;
    render: () => void;
}

export function useDesktopControls({canvasRef, cameraRef, render}: MouseControlOptions) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let isDragging = false;
        let lastX = 0, lastY = 0;

        const ZOOM_SPEED = 1.1;
        const MOVE_SPEED = 5;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dpr = window.devicePixelRatio || 1;
            const dx = (e.clientX - lastX) * dpr;
            const dy = (e.clientY - lastY) * dpr;
            lastX = e.clientX;
            lastY = e.clientY;
            cameraRef.current.applyPan(dx, -dy);

            render();
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            const x = (e.clientX - rect.left) * dpr;
            const y = (e.clientY - rect.top) * dpr;

            const dx = x - canvas.width / 2 - cameraRef.current.x;
            const dy = y - canvas.height / 2 + cameraRef.current.y;

            cameraRef.current.applyZoom(-e.deltaY, dx, dy);

            render();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case "ArrowUp":
                    cameraRef.current.applyPan(MOVE_SPEED, 0);
                    break;
                case "ArrowDown":
                    cameraRef.current.applyPan(-MOVE_SPEED, 0);
                    break;

                case "ArrowLeft":
                    cameraRef.current.applyPan(0, MOVE_SPEED);
                    break;
                case "ArrowRight":
                    cameraRef.current.applyPan(0, -MOVE_SPEED);
                    break;

                case "PageUp":
                case "+":
                    cameraRef.current.applyZoom(ZOOM_SPEED, 0, 0);
                    break;
                case "PageDown":
                case "-":
                    cameraRef.current.applyZoom(-ZOOM_SPEED, 0, 0);
                    break;
            }

            render();
        }

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('wheel', onWheel, {passive: false});
        document.addEventListener('keydown', onKeyDown);

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('wheel', onWheel);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [canvasRef, cameraRef, render])
}
