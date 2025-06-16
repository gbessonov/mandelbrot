import {useCallback, useEffect, useRef} from 'react';
import vertexShaderSource from './shaders/vertexShader.glsl';
import fragmentShaderSource from './shaders/fragmentShader.glsl';

import {Camera} from "./core/camera.ts";
import {useInputControls} from './hooks/useInputControls';

import './App.css';
import CameraInfo from "./components/cameraInfo/cameraInfo.tsx";

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
    uCenterHigh: WebGLUniformLocation;
    uCenterLow: WebGLUniformLocation;
    uZoom: WebGLUniformLocation;
}

function splitFloat64(value: number): [number, number] {
    const high = Math.fround(value);
    const low = value - high;
    return [high, low];
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
    const uCenterHigh = gl.getUniformLocation(program, 'u_center_high');
    const uCenterLow = gl.getUniformLocation(program, 'u_center_low');
    const uZoom = gl.getUniformLocation(program, 'u_zoom');

    if (!uResolution || !uCenterHigh || !uCenterLow || !uZoom) {
        throw new Error(`Failed to get uniform locations: res: ${uResolution}, ch: ${uCenterHigh}, cl: ${uCenterLow}, z: ${uZoom}`);
    }

    return {gl, program, uResolution, uCenterHigh, uCenterLow, uZoom};
}

const App = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const cameraRef = useRef<Camera>(new Camera(50, 0, 60));
    const animationId = useRef<number | null>(null);
    const glContextRef = useRef<GLContext | null>(null);

    const render = useCallback((context: GLContext) => {
        const {gl, program, uResolution, uCenterHigh, uCenterLow, uZoom} = context;
        const canvas = gl.canvas as HTMLCanvasElement;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uZoom, cameraRef.current.zoom);

        const [xHigh, xLow] = splitFloat64(cameraRef.current.x);
        const [yHigh, yLow] = splitFloat64(cameraRef.current.y);

        gl.uniform2f(uCenterHigh, xHigh, yHigh);
        gl.uniform2f(uCenterLow, xLow, yLow);

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
        cameraRef: cameraRef,
        render: () => {
            if (!glContextRef.current) {
                return;
            }
            render(glContextRef.current);
        },
    });

    return (
        <>
            <canvas className="main-canvas" ref={canvasRef}/>
            <CameraInfo cameraRef={cameraRef}/>
        </>
    );
};

export default App;