/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("gl-canvas");
const gl = canvas.getContext("webgl2");
const fpsCounter = document.getElementById("fps-counter");
const generationCounter = document.getElementById("generation-counter");
const iterationSlider = document.getElementById("iteration-slider");
const speedLabel = document.getElementById("speed-label");
const guiToggle = document.getElementById("gui-toggle");
const pauseToggle = document.getElementById("pause-toggle");
const stepButton = document.getElementById("step-button");

class Texture {
    constructor(width, height, fill=0) {
        this.width = width;
        this.height = height;

        const pixels = new Uint8Array(width * height);
        if (fill != 0) {
            for (let i = 0; i < width * height; i++) {
                if (Math.random() < fill) {
                    pixels[i] = 255;
                }
            }
        }

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R8,
            width,
            height,
            0,
            gl.RED,
            gl.UNSIGNED_BYTE,
            pixels
        );

        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    bindTexture() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }

    renderTo() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, this.width, this.height);
    }
}

class Shader {
    constructor(vertexSource, fragmentSource) {
        const vertex = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertex, vertexSource);
        gl.compileShader(vertex);

        const vertexLog = gl.getShaderInfoLog(vertex);
        if (vertexLog) {
            alert(vertexLog);
        }

        const fragment = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragment, fragmentSource);
        gl.compileShader(fragment);

        const fragmentLog = gl.getShaderInfoLog(fragment);
        if (fragmentLog) {
            alert(fragmentLog);
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertex);
        gl.attachShader(this.program, fragment);
        gl.linkProgram(this.program);

        const programLog = gl.getProgramInfoLog(this.program);
        if (programLog) {
            alert(programLog);
        }

        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
    }

    use() {
        gl.useProgram(this.program);
    }

    location(name) {
        return gl.getUniformLocation(this.program, name);
    }
}

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
window.dispatchEvent(new Event("resize"));

let guiShown = true;
guiToggle.addEventListener("click", () => {
    guiShown = !guiShown;
    document.querySelectorAll(".panel").forEach((e) => {
        e.classList.toggle("panel-hidden");
    });
});

const vertices = new Float32Array([
    -1.0, -1.0, 0.0,
    1.0,-1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0,-1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0
]);

let simControls = {iterations: 1, generation: 0, fps: 10, pause: false, step: false};
let frameSkipper = {frameCount: 0, current: 0};

pauseToggle.addEventListener("click", () => {
    simControls.pause = !simControls.pause;
    pauseToggle.innerText = (simControls.pause) ? "Play" : "Pause";
    if (!simControls.pause) {
        frameSkipper.frameCount = 0;
        frameSkipper.current = 0;
        simControls.step = true;
        requestAnimationFrame(renderFrame);
    }
});
stepButton.addEventListener("click", () => {
    if (!simControls.pause) {
        pauseToggle.click();
    }
    simControls.step = true;
    requestAnimationFrame(renderFrame);
});

function updateSimSpeed() {
    if (simControls.fps == 60) {
        speedLabel.innerText = simControls.iterations + "x";
    } else {
        speedLabel.innerText = simControls.fps + "/s";
    }
}

function updateSimSlider() {
    if (simControls.fps == 60) {
        iterationSlider.value = Math.sqrt((simControls.iterations - 1) / 31) * 110 + 90;
    } else {
        iterationSlider.value = Math.sqrt((simControls.fps - 1) / 58) * 90;
    }
    updateSimSpeed();
}

updateSimSlider();

iterationSlider.addEventListener("input", () => {
    if (iterationSlider.value >= 95) {
        let value = (iterationSlider.value - 95) / 105;
        simControls.iterations = Math.round(Math.pow(value, 2) * 31) + 1;
        simControls.fps = 60;
    } else {
        let value = iterationSlider.value / 95;
        simControls.iterations = 1;
        simControls.fps = Math.round(Math.pow(value, 2) * 58) + 1;
    }
    updateSimSpeed();
});

window.addEventListener("keydown", (e) => {
    if (e.key == "0") {
        simControls.fps = 60;
        simControls.iterations = 1;
        updateSimSlider();
        return;
    } else if (e.key == " ") {
        stepButton.click();
        return;
    } else if (e.key == "Enter") {
        pauseToggle.click();
        return;
    }

    if (e.key == "=") {
        simControls.fps += 1;
    } else if (e.key == "-") {
        simControls.fps -= 1;
    } else {
        return;
    }

    if (simControls.fps == 0) {
        simControls.fps = 1;
        return;
    } else if (simControls.fps == 61) {
        simControls.fps = 60;
        if (simControls.iterations == 32) {
            return;
        }
        simControls.iterations += 1;
    } else if (simControls.fps == 59 && e.key == "-" && simControls.iterations != 1) {
        simControls.fps = 60;
        simControls.iterations -= 1;
    }
    updateSimSlider();
});

const mapSize = 1024;
const scaleMin = 0.5;
const scaleMax = 16;
const scaleSteps = 5;
let mapView = {x: 0, y: 0, scale: 2.0, drag: false};

canvas.addEventListener("mousedown", () => {mapView.drag = true;});
canvas.addEventListener("mouseup", () => {mapView.drag = false;});
canvas.addEventListener("mousemove", (e) => {
    if (e.buttons & 1) {
        mapView.x += e.movementX / mapView.scale;
        mapView.y -= e.movementY / mapView.scale;
        if (simControls.pause) {
            requestAnimationFrame(renderFrame);
        }
    }
});
canvas.addEventListener("wheel", (e) => {
    let before = mapView.scale;
    mapView.scale /= Math.pow(2, e.deltaY * 0.01 / scaleSteps);
    mapView.scale = Math.min(Math.max(mapView.scale, scaleMin), scaleMax);
    mapView.x += e.offsetX * (-1 / before + 1 / mapView.scale);
    mapView.y += (canvas.height - e.offsetY) * (-1 / before + 1 / mapView.scale);
    if (simControls.pause) {
        requestAnimationFrame(renderFrame);
    }
});

let renderFrame = (now) => {alert("GL not loaded yet");};
async function main() {
    if (gl == null) {
        alert("Unable to initialize WebGL");
        return;
    }

    const vbo = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bindVertexArray(vao);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * vertices.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(0);

    const vertexResponse = await fetch("vertex.glsl");
    const vertexSource = await vertexResponse.text();
    const renderFragResponse = await fetch("frag_render.glsl");
    const renderFragSource = await renderFragResponse.text();
    const logicFragResponse = await fetch("frag_logic.glsl");
    const logicFragSource = await logicFragResponse.text();

    const renderShader = new Shader(vertexSource, renderFragSource);
    const logicShader = new Shader(vertexSource, logicFragSource);

    let front = new Texture(mapSize, mapSize, 0.37);
    let back = new Texture(mapSize, mapSize);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderShader.use();
    gl.uniform1i(renderShader.location("uTexture"), 0);
    gl.uniform2f(renderShader.location("screenSize"), canvas.width, canvas.height);
    gl.uniform2i(renderShader.location("mapSize"), mapSize, mapSize);

    logicShader.use();
    gl.uniform1i(logicShader.location("uTexture"), 0);
    gl.uniform1f(logicShader.location("rest"), 0.5);
    gl.uniform2i(logicShader.location("mapSize"), mapSize, mapSize);

    function stepLogic() {
        let temp = front;
        front = back;
        back = temp;

        logicShader.use();
        back.bindTexture();
        front.renderTo();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        simControls.generation++;
    }

    let then = 0;
    let frames = [];
    renderFrame = (now) => {
        let delta = (now - then) * 0.001;
        if (then != 0) {
            frames.push(delta);
        }
        then = now;
        let total = frames.reduce((prev, curr, _) => prev + curr, 0);
        if (total > 1) {
            let fps = frames.length / total;
            fpsCounter.innerText = fps.toFixed(1);
            frames = [];
        }

        let skipFrame = false;
        frameSkipper.current += 1 / 60;
        skipFrame = frameSkipper.current < frameSkipper.frameCount + 1 / simControls.fps;

        if (!(simControls.pause || skipFrame)) {
            frameSkipper.frameCount += 1 / simControls.fps;
            for (let i = 0; i < simControls.iterations; i++) {
                stepLogic();
            }
        } else if (simControls.step) {
            stepLogic();
            simControls.step = false;
        }
        generationCounter.innerText = simControls.generation;

        renderShader.use();
        front.bindTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(renderShader.location("center"), mapView.x, mapView.y);
        gl.uniform1f(renderShader.location("scale"), mapView.scale);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (!simControls.pause) {
            requestAnimationFrame(renderFrame);
        }
    }

    requestAnimationFrame(renderFrame);
}

window.addEventListener("DOMContentLoaded", async () => await main(), false);
