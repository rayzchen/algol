/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("gl-canvas");
const gl = canvas.getContext("webgl2");

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

    loadPixels(data) {
        const pixels = new Uint8Array(this.width * this.height);
        const startX = Math.floor((this.width - data[0].length) / 2);
        const startY = Math.floor((this.width - data.length) / 2);
        for (let y = 0; y < data.length; y++) {
            for (let x = 0; x < data[0].length; x++) {
                pixels[(data.length - 1 - y + startY) * this.width + x + startX] = data[y][x];
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R8,
            this.width,
            this.height,
            0,
            gl.RED,
            gl.UNSIGNED_BYTE,
            pixels
        );
    }
}

async function loadRLE(url) {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split(/\r?\n/);
    while (lines[0][0] == "#") {
        lines.shift();
    }
    const header = lines.shift().match(/^x = (\d+), y = (\d+), rule = (.*)/);
    const data = new Uint8Array(header[1] * header[2]);
    let curr = 0;
    let y = 0;
    while (true) {
        let length = 1;
        let run = lines[0].match(/^\d+/);
        if (run) {
            length = parseInt(run[0]);
            lines[0] = lines[0].replace(/^\d+/, "");
        }
        let char = lines[0][0];
        lines[0] = lines[0].slice(1);
        if (char == "$") {
            y += length;
            curr = 0;
        } else if (char == "!") {
            y = header[2];
            break;
        } else if (char == "b") {
            curr += length;
        } else {
            for (let i = 0; i < length; i++) {
                if (curr >= header[1]) {
                    throw new Error("out of bounds");
                }
                data[y * header[1] + curr] = 255;
                curr++;
            }
        }
        if (!lines[0]) {
            lines.shift();
        }
    }
    let grid = [];
    for (let y = 0; y < header[2]; y++) {
        grid.push(data.slice(y * header[1], (y + 1) * header[1]));
    }
    return grid;
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

// GUI elements
const fpsCounter = document.getElementById("fps-counter");
const generationCounter = document.getElementById("generation-counter");
const iterationSlider = document.getElementById("iteration-slider");
const speedLabel = document.getElementById("speed-label");
const scaleLabel = document.getElementById("scale-label");
const guiToggle = document.getElementById("gui-toggle");
const pauseToggle = document.getElementById("pause-toggle");
const stepButton = document.getElementById("step-button");
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = document.getElementById("theme-label");
const wrapCheckbox = document.getElementById("wrap-checkbox");
const resetButton = document.getElementById("reset-button");

document.querySelectorAll(".input-container input").forEach((e) => {
    e.setAttribute("tabindex", "-1");
    e.addEventListener("click", () => {
        document.activeElement.blur();
    });
});

let guiShown = true;
guiToggle.addEventListener("click", () => {
    guiShown = !guiShown;
    document.querySelectorAll(".panel").forEach((e) => {
        e.classList.toggle("panel-hidden");
    });
});

let simControls = {iterations: 1, generation: 0, fps: 10, pause: false, step: false};
let frameSkipper = {frameCount: 0, current: 0};

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (simControls.pause) {
        requestAnimationFrame(renderFrame);
    }
});
window.dispatchEvent(new Event("resize"));

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
    simControls.pause = true;
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

const mapSize = 2048;
const scaleMin = 0.5;
const scaleMax = 16;
const scaleSteps = 5;
let mapView = {x: 0, y: 0, scale: 2.0, drag: false};
function resetView() {
    mapView.x = mapSize / 2 - canvas.width / 2 / mapView.scale;
    mapView.y = mapSize / 2 - canvas.height / 2 / mapView.scale;
}
resetView();

canvas.addEventListener("mousedown", () => {mapView.drag = true;});
canvas.addEventListener("mouseup", () => {mapView.drag = false;});
canvas.addEventListener("mousemove", (e) => {
    if (e.buttons & 1) {
        mapView.x -= e.movementX / mapView.scale;
        mapView.y += e.movementY / mapView.scale;
        if (simControls.pause) {
            requestAnimationFrame(renderFrame);
        }
    }
});
canvas.addEventListener("wheel", (e) => {
    let before = mapView.scale;
    mapView.scale /= Math.pow(2, e.deltaY * 0.01 / scaleSteps);
    mapView.scale = Math.min(Math.max(mapView.scale, scaleMin), scaleMax);
    mapView.x += e.offsetX * (1 / before - 1 / mapView.scale);
    mapView.y += (canvas.height - e.offsetY) * (1 / before - 1 / mapView.scale);
    scaleLabel.innerText = (Math.log2(mapView.scale) + 1).toFixed(1);
    if (simControls.pause) {
        requestAnimationFrame(renderFrame);
    }
});

resetButton.addEventListener("click", () => {
    resetView();
    if (simControls.pause) {
        requestAnimationFrame(renderFrame);
    }
});

const themes = ["Color", "B/W"];
let currentTheme = 0;

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

    const vertices = new Float32Array([
        -1.0, -1.0,
        1.0,-1.0,
        1.0, 1.0,
        -1.0,-1.0,
        1.0, 1.0,
        -1.0, 1.0
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * vertices.BYTES_PER_ELEMENT, 0);
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

    document.querySelectorAll(".loader").forEach((e) => {
        e.addEventListener("click", () => {
            if (!simControls.pause) {
                pauseToggle.click();
            }
            let name = e.innerText.match(/Load (.*)/)[1];
            loadRLE("patterns/" + name + ".rle").then((data) => {
                front.loadPixels(data);
                resetView();
                requestAnimationFrame(renderFrame);
            });
        });
    });

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderShader.use();
    gl.uniform1i(renderShader.location("uTexture"), 0);
    gl.uniform1f(renderShader.location("rest"), 0.5);
    gl.uniform2f(renderShader.location("screenSize"), canvas.width, canvas.height);
    gl.uniform2i(renderShader.location("mapSize"), mapSize, mapSize);

    logicShader.use();
    gl.uniform1i(logicShader.location("uTexture"), 0);
    gl.uniform1f(logicShader.location("rest"), 0.5);
    gl.uniform2i(logicShader.location("mapSize"), mapSize, mapSize);

    themeToggle.addEventListener("click", () => {
        currentTheme = (currentTheme + 1) % themes.length;
        themeLabel.innerText = themes[currentTheme];
        renderShader.use();
        if (currentTheme == 0) {
            gl.uniform1f(renderShader.location("color"), 1.0);
        } else if (currentTheme == 1) {
            gl.uniform1f(renderShader.location("color"), 0.0);
        }
        if (simControls.pause) {
            requestAnimationFrame(renderFrame);
        }
    });
    currentTheme = -1;
    themeToggle.dispatchEvent(new Event("click"));

    wrapCheckbox.addEventListener("input", () => {
        let wrap = (wrapCheckbox.checked) ? 1 : 0;
        logicShader.use();
        gl.uniform1i(logicShader.location("wrap"), wrap);
        renderShader.use();
        gl.uniform1f(renderShader.location("wrap"), wrap);
        if (simControls.pause) {
            requestAnimationFrame(renderFrame);
        }
    });
    wrapCheckbox.dispatchEvent(new Event("input"));

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

await main();
