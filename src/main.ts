const cw = 700;
const ch = 700;
const dt = 0.01;
const stabilizeStep = 300;
const dstep = 2;

interface particle {
    ax: number;
    ay: number;
    oldAx: number;
    oldAy: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    color: string;
}

type force = (dx: number, dy: number, sigma: number) => [number, number];
interface rule {
    [id: string]: force;
}
interface rules {
    [id: string]: rule;
}

const create = (n: number, r: number, color: string): particle[] => {
    return Array(n)
        .fill(null)
        .map((): particle => {
            return {
                x: Math.random(),
                y: Math.random(),
                vx: Math.random() / r,
                vy: Math.random() / r,
                ax: 0,
                ay: 0,
                oldAx: 0,
                oldAy: 0,
                r: r,
                color: color,
            };
        });
};

const plot = (ctx: CanvasRenderingContext2D, particles: particle[]) => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cw, ch);
    particles.forEach((p) => {
        ctx.beginPath();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = p.color;
        ctx.arc(p.x * cw, p.y * ch, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
};

const update = (rules: rules, particles: particle[]) => {
    particles.forEach((p) => {
        p.oldAx = p.ax;
        p.oldAy = p.ay;
        p.ax = 0;
        p.ay = 0;
    });

    for (let i1 = 0; i1 < particles.length; i1++) {
        const p1 = particles[i1];
        if (!(p1.color in rules)) continue;
        const rule = rules[p1.color];
        for (let i2 = 0; i2 < particles.length; i2++) {
            const p2 = particles[i2];
            if (!(p2.color in rule)) continue;
            const f = rule[p2.color];
            let dx = p2.x - p1.x;
            dx = periodic(dx);
            let dy = p2.y - p1.y;
            dy = periodic(dy);
            const [fx, fy] = f(dx, dy, p1.r + p2.r);
            p1.ax += fx;
            p1.ay += fy;
        }
    }

    particles.forEach((p) => {
        p.x += p.vx * dt + 0.5 * dt * dt * p.ax;
        p.x = ((p.x % 1) + 1) % 1;
        p.y += p.vy * dt + 0.5 * dt * dt * p.ay;
        p.y = ((p.y % 1) + 1) % 1;
    });

    particles.forEach((p) => {
        p.vx += 0.5 * dt * (p.ax + p.oldAx);
        p.vx *= 0.9;
        p.vy += 0.5 * dt * (p.ay + p.oldAy);
        p.vy *= 0.9;
    });
};

const adjustMomentum = (particles: particle[]) => {
    const [mvx, mvy] = particles
        .reduce(
            (ret, p) => {
                return [ret[0] + p.vx, ret[1] + p.vy];
            },
            [0, 0],
        )
        .map((mv) => mv / particles.length);

    particles.forEach((p) => {
        p.vx -= mvx / 2;
        p.vy -= mvy / 2;
    });
};

const periodic = (val: number): number => {
    let ret = val;
    if (ret > 0.5) ret -= 1;
    if (ret < -0.5) ret += 1;
    return ret;
};

const force1 = (
    k1: number,
    k2: number,
): ((dx: number, dy: number, sigma: number) => [number, number]) => {
    return (dx: number, dy: number, sigma: number): [number, number] => {
        const d = 1;
        const r2 = dx * dx + dy * dy;
        if (r2 === 0 || r2 > 0.3 ** 2) return [0, 0];
        // sf = - k/Math.sqrt(r2)
        let sf = k2 * d;
        const bf = k1 / r2;
        const f = bf + sf;
        return [f * d * dx, f * d * dy];
    };
};

const random = (l: number, r: number): number => {
    return Math.random() * (r - l) - l;
};

const randomForce1 = (): force => {
    return force1(random(-0.01, 0.01), random(-1, 10));
};

window.onload = async () => {
    document.body.style.display = "flex";
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cw, ch);

    const particles: particle[] = [
        create(30, 3, "yellow"),
        create(30, 3, "cyan"),
        create(30, 3, "red"),
        create(30, 3, "lime"),
        create(30, 3, "white"),
    ].flat();
    const rules: rules = {
        yellow: {
            yellow: force1(-0.01, 0),
            cyan: force1(-0.01,0),
            red: force1(0.01, 0),
            white: force1(0.1, -0.02)
        },
        red: {
            yellow: force1(0, 0),
            cyan: force1(-0.01, 0),
            red: force1(-0.1, 0.1),
            lime: force1(0.1, -0.1)
        },
        cyan: {
            red: force1(0, 0),
            yellow: force1(-0.01, 0),
            cyan: force1(0.01, 0),
            lime: force1(-0.01, 4),
            white: force1(-0.01,0)
        },
        lime: {
            red: force1(-0.01, 0),
            yellow: force1(0.05, 0),
            cyan: force1(0, 0),
            lime: force1(-0.01, 0.1),
            white: force1(-0.01, 4)
        },
        white: {
            red: force1(-0.01, 0),
            yellow: force1(-0.01, 0),
            cyan: force1(-0.01, 0),
            lime: force1(-0.004,-1),
            white: force1(-0.01, 1),
        },
    };
    let step = 0;
    while (true) {
        update(rules, particles);
        if (step < stabilizeStep) {
            //stabilize
            adjustMomentum(particles);
        }
        if (step % dstep === 0) {
            await new Promise((r) => setTimeout(r, 30));
            plot(ctx, particles);
            const pstep = document.getElementById(
                "step",
            ) as HTMLParagraphElement;
            pstep.innerText = `STEP: ${step}`;
        }
        step++;
    }
};
