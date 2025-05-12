import React, {useEffect, useRef} from 'react';
import vertexShaderSource from './shaders/vertexShader.glsl';
import fragmentShaderSource from './shaders/fragmentShader.glsl';

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
}

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const center = useRef({x: -0.5, y: 0});
    const zoomLog = useRef(60);
    const ZOOM_SPEED = 1.1;
    const MOVE_SPEED = 5;
    const FULLSCREEN_TRIANGLE = new Float32Array([
        -1, -1,
        1, -1,
        -1,  1,
        -1,  1,
        1, -1,
        1,  1,
    ]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const gl = canvas.getContext('webgl2')!;
        if (!gl) {
            return;
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const program = gl.createProgram()!;
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) {
            throw ("program failed to link:" + gl.getProgramInfoLog(program));
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, 'u_resolution');
        const uCenter = gl.getUniformLocation(program, 'u_center');
        const uZoom = gl.getUniformLocation(program, 'u_zoom');

        if (uResolution === null || uCenter === null || uZoom === null) {
            throw new Error('Failed to get uniform locations');
        }

        function _render() {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(program);
            gl.uniform2f(uResolution, canvas.width, canvas.height);
            gl.uniform2f(uCenter, center.current.x, center.current.y);
            gl.uniform1f(uZoom, Math.pow(ZOOM_SPEED, zoomLog.current));
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        const render = () => {
            window.requestAnimationFrame(_render);
        }

        render();

        let isDragging = false;
        let lastX = 0, lastY = 0;

        // Mouse + Keyboard

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) {
                return;
            }
            const speed = 0.5;

            center.current.x += (e.clientX - lastX) * speed;
            center.current.y -= (e.clientY - lastY) * speed;

            lastX = e.clientX;
            lastY = e.clientY;
            render();
        };

        const onWheel = (event: WheelEvent) => {
            if (event.deltaY == 0) {
                return;
            }
            const dx = event.clientX - gl.canvas.width / 2 - center.current.x;
            const dy = event.clientY - gl.canvas.height / 2 + center.current.y;
            if (event.deltaY < 0) {
                zoomLog.current += 1;
                const k = ZOOM_SPEED - 1;
                center.current.x -= k * dx;
                center.current.y += k * dy;
            } else {
                zoomLog.current -= 1;
                const k = 1 - 1 / ZOOM_SPEED;
                center.current.x += k * dx;
                center.current.y -= k * dy;
            }
            render();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case "ArrowUp":
                    center.current.y += MOVE_SPEED;
                    break;
                case "ArrowDown":
                    center.current.y -= MOVE_SPEED;
                    break;

                case "ArrowLeft":
                    center.current.x -= MOVE_SPEED;
                    break;
                case "ArrowRight":
                    center.current.x += MOVE_SPEED;
                    break;

                case "PageUp":
                case "+":
                    zoomLog.current += 1;
                    break;
                case "PageDown":
                case "-":
                    zoomLog.current -= 1;
                    break;
            }

            render();
        }

        // Touch

        let lastTouchX = 0, lastTouchY = 0;
        let lastTouchDistance = 0;
        let isTouchDragging = false;

        const getTouchDistance = (touches: TouchList) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                isTouchDragging = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                lastTouchDistance = getTouchDistance(e.touches);
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1 && isTouchDragging) {
                const dx = e.touches[0].clientX - lastTouchX;
                const dy = e.touches[0].clientY - lastTouchY;

                const speed = 0.5;
                center.current.x += dx * speed;
                center.current.y -= dy * speed;

                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;

                render();
            } else if (e.touches.length === 2) {
                const newDistance = getTouchDistance(e.touches);
                const delta = newDistance - lastTouchDistance;

                if (Math.abs(delta) > 2) {
                    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                    const dx = midX - gl.canvas.width / 2 - center.current.x;
                    const dy = midY - gl.canvas.height / 2 + center.current.y;

                    if (delta > 0) {
                        zoomLog.current += 1;
                        const k = ZOOM_SPEED - 1;
                        center.current.x -= k * dx;
                        center.current.y += k * dy;
                    } else {
                        zoomLog.current -= 1;
                        const k = 1 - 1 / ZOOM_SPEED;
                        center.current.x += k * dx;
                        center.current.y -= k * dy;
                    }

                    lastTouchDistance = newDistance;
                    render();
                }
            }
        };

        const onTouchEnd = () => {
            isTouchDragging = false;
        };

        const preventTouchScroll = (e: TouchEvent) => {
            if (e.target === canvas) {
                e.preventDefault();
            }
        };

        const onResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            render();
        }
        
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('wheel', onWheel);
        document.addEventListener('keydown', onKeyDown);

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
        document.body.addEventListener('touchmove', preventTouchScroll, { passive: false });


        window.addEventListener('resize', onResize);

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('wheel', onWheel);
            document.removeEventListener('keydown', onKeyDown);

            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            document.body.removeEventListener('touchmove', preventTouchScroll);

            window.removeEventListener('resize', onResize);
        };

    }, []);

    return <canvas ref={canvasRef} style={{width: '100vw', height: '100vh', display: 'block'}}/>;
};

export default App;

