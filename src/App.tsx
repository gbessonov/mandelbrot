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
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1,
        ]), gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, 'u_resolution');
        const uCenter = gl.getUniformLocation(program, 'u_center');
        const uZoom = gl.getUniformLocation(program, 'u_zoom');

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

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) {
                return;
            }
            const speed = 0.5;

            center.current.x += (e.clientX - lastX) * speed;
            center.current.y -= (e.clientY - lastY) * speed;

            lastX = e.clientX;
            lastY = e.clientY;
            render();
        });

        canvas.addEventListener('wheel', (event) => {
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
        });

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            render();
        });

        document.addEventListener("keydown", (event) => {
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
        });

    }, []);

    return <canvas ref={canvasRef} style={{width: '100vw', height: '100vh', display: 'block'}}/>;
};

export default App;

