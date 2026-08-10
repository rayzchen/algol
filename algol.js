/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("gl-canvas");
const gl = canvas.getContext("webgl2");
const fpsCounter = document.getElementById("fps-counter");
const generationCounter = document.getElementById("generation-counter");
const iterationSlider = document.getElementById("iteration-slider");
const guiToggle = document.getElementById("gui-toggle");

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

let guiShown = true;
guiToggle.addEventListener("click", () => {
    guiShown = !guiShown;
    document.querySelectorAll(".panel").forEach((e) => {
        e.classList.toggle("panel-hidden");
    });
});

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

const vertices = new Float32Array([
    -1.0, -1.0, 0.0,
    1.0,-1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0,-1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0
]);

let simControls = {iterations: 1, generation: 0};
iterationSlider.addEventListener("input", () => {
    simControls.iterations = iterationSlider.value;
});

const mapSize = 512;
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
    }
});
canvas.addEventListener("wheel", (e) => {
    let before = mapView.scale;
    mapView.scale /= Math.pow(2, e.deltaY * 0.01 / scaleSteps);
    mapView.scale = Math.min(Math.max(mapView.scale, scaleMin), scaleMax);
    mapView.x += e.offsetX * (-1 / before + 1 / mapView.scale);
    mapView.y += (canvas.height - e.offsetY) * (-1 / before + 1 / mapView.scale);
});

async function main() {
    if (gl == null) {
        alert("Unable to initialize WebGL");
        return;
    }

    window.dispatchEvent(new Event("resize"));

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

    let then = 0;
    let frames = [];
    function renderFrame(now) {
        for (let i = 0; i < simControls.iterations; i++) {
            let temp = front;
            front = back;
            back = temp;

            logicShader.use();
            back.bindTexture();
            front.renderTo();
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            simControls.generation++;
        }

        renderShader.use();
        front.bindTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(renderShader.location("center"), mapView.x, mapView.y);
        gl.uniform1f(renderShader.location("scale"), mapView.scale);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(renderFrame);

        if (then != 0) {
            frames.push((now - then) * 0.001);
        }
        then = now;
        let total = frames.reduce((prev, curr, _) => prev + curr, 0);
        if (total > 1) {
            let fps = frames.length / total;
            fpsCounter.innerText = fps.toFixed(1);
            frames = [];
        }

        generationCounter.innerText = simControls.generation;
    }

    requestAnimationFrame(renderFrame);
}

window.addEventListener("DOMContentLoaded", async () => await main(), false);
