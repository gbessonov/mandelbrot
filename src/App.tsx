import {useCallback, useEffect, useRef} from 'react';
import vertexShaderSource from './shaders/vertexShader.glsl';
import fragmentShaderSource from './shaders/fragmentShader.glsl';

import {Camera} from "./core/camera.ts";
import {useInputControls} from './hooks/useInputControls';

const FULLSCREEN_TRIANGLE = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
]);

interface GLContext {
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    uResolution: WebGLUniformLocation;
    uCenter: WebGLUniformLocation;
    uZoom: WebGLUniformLocation;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
}

function initGL(canvas: HTMLCanvasElement): GLContext {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not supported');

    const program = gl.createProgram();
    if (!program) throw new Error('Unable to create program');

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
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

    if (!uResolution || !uCenter || !uZoom) {
        throw new Error('Failed to get uniform locations');
    }

    return {gl, program, uResolution, uCenter, uZoom};
}

const App = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const camera = useRef<Camera>(new Camera(50, 0, 60));
    const animationId = useRef<number | null>(null);
    const glContextRef = useRef<GLContext | null>(null);

    const render = useCallback((context: GLContext) => {
        const {gl, program, uResolution, uCenter, uZoom} = context;
        const canvas = gl.canvas as HTMLCanvasElement;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform2f(uCenter, camera.current.x, camera.current.y);
        gl.uniform1f(uZoom, camera.current.zoom);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
        };

        resizeCanvas();
        const glContext = initGL(canvas);
        glContextRef.current = glContext;

        const loop = () => {
            render(glContext);
            animationId.current = requestAnimationFrame(loop);
        };
        loop();

        window.addEventListener('resize', resizeCanvas);

        return () => {
            if (animationId.current !== null) {
                cancelAnimationFrame(animationId.current);
            }
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [render]);

    useInputControls({
        canvasRef,
        cameraRef: camera,
        render: () => {
            if (glContextRef.current) {
                render(glContextRef.current);
            }
        },
    });

    return <canvas ref={canvasRef} style={{width: '100vw', height: '100vh', display: 'block'}}/>;
};

export default App;
