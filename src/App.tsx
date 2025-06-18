import { useCallback, useEffect, useRef } from 'react';

import { Camera } from './core/camera';
import { ShaderManager } from './core/ShaderManager';
import { useInputControls } from './hooks/useInputControls';
import CameraInfo from './components/cameraInfo/cameraInfo';

import vertexShaderSource from './shaders/vertexShader.glsl';
import fragmentShaderCommon from './shaders/fragmentShader_common.glsl';
import fragmentShader_tail_basic from './shaders/fragmentShader_tail_basic.glsl';
import fragmentShader_tail_df64 from './shaders/fragmentShader_tail_df64.glsl';

const fragmentShaderSource_basic = fragmentShaderCommon + '\n' + fragmentShader_tail_basic;
const fragmentShaderSource_df64 = fragmentShaderCommon + '\n' + fragmentShader_tail_df64;

import './App.css';

const FULLSCREEN_TRIANGLE = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
]);

function splitFloat64(value: number): [number, number] {
    const high = Math.fround(value);
    const low = value - high;
    return [high, low];
}

const App = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const cameraRef = useRef<Camera>(new Camera(50, 0, 60));
    const animationId = useRef<number | null>(null);
    const shaderManagerRef = useRef<ShaderManager | null>(null);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !shaderManagerRef.current) return;

        const gl = canvas.getContext('webgl2');
        if (!gl) return;

        const { zoom, x, y } = cameraRef.current;
        const shader = shaderManagerRef.current.getShaderContext(zoom);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(shader.program);

        gl.uniform2f(shader.uniforms.uResolution, canvas.width, canvas.height);
        gl.uniform1f(shader.uniforms.uZoom, zoom);

        const [xHigh, xLow] = splitFloat64(x);
        const [yHigh, yLow] = splitFloat64(y);

        gl.uniform2f(shader.uniforms.uCenterX, xHigh, xLow);
        gl.uniform2f(shader.uniforms.uCenterY, yHigh, yLow);

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

        const gl = canvas.getContext('webgl2');
        if (!gl) throw new Error('WebGL2 not supported');

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);

        const shaderManager = new ShaderManager(gl);
        const df64_threshold = 1e7;
        shaderManager.registerShader(0, df64_threshold, vertexShaderSource, fragmentShaderSource_basic);
        shaderManager.registerShader(df64_threshold, 1e10, vertexShaderSource, fragmentShaderSource_df64);

        shaderManagerRef.current = shaderManager;

        const setupVertexAttribs = (program: WebGLProgram) => {
            const aPosition = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(aPosition);
            gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
        };

        // Setup for the first shader
        setupVertexAttribs(shaderManager.getShaderContext(cameraRef.current.zoom).program);

        const loop = () => {
            render();
            animationId.current = requestAnimationFrame(loop);
        };
        loop();

        window.addEventListener('resize', resizeCanvas);

        return () => {
            if (animationId.current !== null) cancelAnimationFrame(animationId.current);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [render]);

    useInputControls({
        canvasRef,
        cameraRef: cameraRef,
        render: () => render(),
    });

    return (
        <>
            <canvas className="main-canvas" ref={canvasRef} />
            <CameraInfo cameraRef={cameraRef} />
        </>
    );
};

export default App;
