let game;
function preload() {}

function setup() {
	createCanvas(500, 500);
	frameRate(60);
	game = new Game();
}

function draw() {
	background(0);
	game.render();
}
function keyReleased() {
	// WASD 87 65 83 68
	switch (keyCode) {
		case 87:
			game.player.move(0, -1);
			break;
		case 65:
			game.player.move(-1, 0);
			break;
		case 83:
			game.player.move(0, 1);
			break;
		case 68:
			game.player.move(1, 0);
			break;

		default:
			break;
	}
	return false; // prevent any default behavior
}

class Game {
	constructor() {
		this.res = 64;
		this.map = new Map(this.res);
		this.map.generate();
		this.player = new Player({ res: this.res, tile: _.filter(_.flatten(this.map.tiles), { center: true }) });
		this.cam = new Camera();
		this.state = "preparation"; // "preparation" "started" "over"
		this.difficulty = 1;
	}
	render() {
		this.cam.render(this.player, this.map);
	}
}
class Camera {
	constructor() {
		this.anchor = createVector(width * 0.5, height * 0.5);
		this.onanimation = false;
		this.tilt = createVector(0, 0);
	}
	render(playerInstance, mapInstance) {
		if (
			frameCount % 5 == 0 &&
			(!playerInstance.moving || abs(playerInstance.pos.x + this.tilt.x - this.anchor.x) > width * 0.4 || abs(playerInstance.pos.y + this.tilt.y - this.anchor.y) > height * 0.4) &&
			(playerInstance.pos.x + this.tilt.x != this.anchor.x || playerInstance.pos.y + this.tilt.y != this.anchor.y)
		) {
			gsap.to(this.tilt, { x: this.anchor.x - playerInstance.pos.x, y: this.anchor.y - playerInstance.pos.y, duration: 0.3 });
		}
		// map isn't tilting
		push();
		rectMode(CENTER);
		mapInstance.render(this.tilt);
		playerInstance.render(this.tilt);
		pop();
	}
}
class Player {
	constructor({ res = 64, tile }) {
		this.ontile = (tile.length && tile.length > 1) || tile ? tile[0] : undefined;
		console.log(this.ontile);
		this.res = res;
		this.pos = createVector(this.ontile.pos.x, this.ontile.pos.y);
		this.queue = [];
		this.moving = false;
	}
	render(vector) {
		push();
		fill("red").rect((vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y, this.res, this.res);
		pop();
		if (!this.moving && this.queue.length) {
			this.moving = true;
			let dir = this.queue.shift();
			let newIndex = this.ontile.index + game.map.radius * dir[0] + dir[1];
			if (
				newIndex < 0 ||
				newIndex > _.flatten(game.map.tiles).length - 1 ||
				(floor(this.ontile.index / game.map.radius) == 0 && dir[0] < 0) ||
				(ceil(this.ontile.index / game.map.radius) == game.map.radius && dir[0] > 0)
			) {
				newIndex = this.ontile.index;
			}
			if (newIndex == this.ontile.index) {
				this.moving = false;
			} else {
				this.ontile = _.flatten(game.map.tiles)[newIndex];
				gsap.to(this.pos, {
					x: this.ontile.pos.x,
					y: this.ontile.pos.y,
					duration: 0.1,
					onComplete: () => {
						this.moving = false;
					},
				});
			}
		}
	}
	move(x = 0, y = 0) {
		this.queue.push([x, y]);
	}
}
class Map {
	constructor(res = 64) {
		this.res = res;
		this.tiles = [];
		this.radius = (res >= 64 ? 8 : res < 64 ? 12 : res < 32 ? 18 : 24) + 1;
	}
	generate(difficulty = 1) {
		for (let i = 0; i < this.radius; i++) {
			let row = [];
			for (let u = 0; u < this.radius; u++) {
				row.push(new Tiles({ index: i * this.radius + u, res: this.res, x: i * this.res, y: u * this.res, center: this.radius - (i - 1) == i && this.radius - (u - 1) == u }));
			}
			this.tiles.push(row);
		}
	}
	render(vector) {
		_.flatten(game.map.tiles).forEach((e) => {
			e.render(vector);
		});
	}
}
class Tiles {
	constructor({ r = false, l = false, t = false, b = false, center = false, x = 0, y = 0, res = 64, index = false }) {
		if (index != undefined) {
			this.index = index;
		}
		this.pos = createVector(x, y);
		this.res = res;
		this.collide = {
			right: r,
			left: l,
			top: t,
			bottom: b,
		};
		this.center = center;
	}
	render(vector) {
		push();
		stroke(50)
			.noFill()
			.strokeWeight(1)
			.rect((vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y, this.res, this.res);
		pop();
	}
}
