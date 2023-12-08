let game;
let currentFPS = 0;
let rgb = {
	r: 255,
	g: 0,
	b: 0,
};
function rgbAnimate() {
	let state = [rgb.r == 255, rgb.g == 255, rgb.b == 255];
	if (!_.includes(state, true)) return;
	gsap.to(rgb, { r: state[2] ? 255 : 0, g: state[0] ? 255 : 0, b: state[1] ? 255 : 0, duration: 1 });
}
function preload() {}

function setup() {
	createCanvas(500, 500);
	frameRate(60);
	game = new Game();
}

function draw() {
	background(0);
	renderFPS();
	game.render();
}
function renderFPS() {
	if (frameCount % 10 == 0) {
		currentFPS = round(frameRate());
	}
	push();
	fill(255).noStroke().strokeWeight(0).text(currentFPS, 10, 20);
	pop();
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
		this.res = 32;
		this.radius = (this.res > 64 ? 4 : this.res >= 48 ? 8 : this.res >= 32 ? 12 : this.res >= 16 ? 16 : this.res >= 8 ? 32 : 64) + 1;
		this.map = new Map(this.res);
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
		if (game.state == "preparation" && frameCount % 5 == 0) {
			mapInstance.generate();
		}
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
		mapInstance.renderCollision(this.tilt);
		pop();
	}
}
class Player {
	constructor({ res = 64, tile }) {
		this.ontile = (tile.length && tile.length > 1) || tile ? tile[0] : undefined;
		this.res = res;
		this.radius = (this.res > 64 ? 4 : this.res >= 48 ? 8 : this.res >= 32 ? 12 : this.res >= 16 ? 16 : this.res >= 8 ? 32 : 64) + 1;
		this.pos = createVector(this.ontile.pos.x, this.ontile.pos.y);
		this.queue = [];
		this.moving = false;
	}
	render(vector) {
		push();
		fill("red")
			.noStroke()
			.rect((vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y, this.res, this.res);
		pop();
		if (!this.moving && this.queue.length) {
			this.moving = true;
			let dir = this.queue.shift();
			let newIndex = this.ontile.index + this.radius * dir[1] + dir[0];
			let destination = _.flatten(game.map.tiles)[newIndex];
			if (
				newIndex < 0 ||
				newIndex > _.flatten(game.map.tiles).length - 1 ||
				(floor(this.ontile.index / this.radius) == 0 && dir[1] < 0) ||
				(ceil(this.ontile.index / this.radius) == this.radius && dir[1] > 0) ||
				(this.ontile.index % this.radius == 0 && dir[0] < 0) ||
				(this.ontile.index % this.radius == this.radius - 1 && dir[0] > 0) ||
				!game.state == "started" ||
				(dir[0] > 0 && (destination.collide.left || this.ontile.collide.right)) || //* right
				(dir[0] < 0 && (destination.collide.right || this.ontile.collide.left)) || //* left
				(dir[1] > 0 && (destination.collide.top || this.ontile.collide.bottom)) || //* bottom
				(dir[1] < 0 && (destination.collide.bottom || this.ontile.collide.top)) //* top
			) {
				newIndex = this.ontile.index;
			}
			if (newIndex == this.ontile.index) {
				this.moving = false;
			} else {
				this.ontile = destination;
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
		this.radius = (res > 64 ? 4 : res >= 48 ? 8 : res >= 32 ? 12 : res >= 16 ? 16 : res >= 8 ? 32 : 64) + 1;
		for (let i = 0; i < this.radius; i++) {
			let row = [];
			for (let u = 0; u < this.radius; u++) {
				row.push(new Tiles({ index: i * this.radius + u, res: this.res, x: u * this.res, y: i * this.res, center: (pow(this.radius, 2) - 1) * 0.5 == i * this.radius + u }));
			}
			this.tiles.push(row);
		}
		this.flattenTiles = _.flatten(this.tiles);
	}
	async generate() {
		if (this.flattenTiles.length == 0 || game.state != "preparation") return;
		game.state = "preparing";
		this.tiles.forEach((e) => {
			e.forEach((x) => {
				x.collide = {
					right: true,
					left: true,
					top: true,
					bottom: true,
				};
			});
		});
		this.flattenTiles = _.flatten(this.tiles);
		let getDirection = ({ r = false, l = false, t = false, b = false }) => {
			let availableIndex = [];
			if (!r) availableIndex.push("right");
			if (!l) availableIndex.push("left");
			if (!t) availableIndex.push("top");
			if (!b) availableIndex.push("bottom");
			return availableIndex[_.floor(_.random(0, availableIndex.length - 1))];
		};
		let checkPath = (tile) => {
			return {
				r: _.includes(_.concat(passed, generated), tile.index + 1) || current.index % this.radius == this.radius - 1,
				l: _.includes(_.concat(passed, generated), tile.index - 1) || current.index % this.radius == 0,
				b: _.includes(_.concat(passed, generated), tile.index + this.radius) || ceil((current.index + 1) / this.radius) == this.radius,
				t: _.includes(_.concat(passed, generated), tile.index - this.radius) || floor(current.index / this.radius) == 0,
			};
		};
		let getRandomTile = () => {
			if (generated.length == 0) return;
			let picked = generated[_.random(generated.length - 1, false)];
			let pickedTile = getTile(picked);
			let pickedPath = checkPath(pickedTile);
			return _.includes(pickedPath, false) ? picked : getRandomTile();
		};
		let getTile = (index) => this.tiles[floor(index / this.radius)][index % this.radius];
		let passed = [game.player.ontile.index];
		let generated = [];
		let generating = true;
		let current = game.player.ontile;
		while (generating) {
			generated = _.union(generated);
			passed = _.union(passed);
			generating = generated.length + passed.length != this.flattenTiles.length;
			let path = checkPath(current);
			let dir = getDirection(path);
			let destinationTile = this.flattenTiles[current.index + (dir == "right" ? 1 : dir == "left" ? -1 : dir == "bottom" ? this.radius : dir == "top" ? -this.radius : 0)];
			if (!_.includes(path, false) || (_.random(3, false) == 1 && generated.length + passed.length != 0)) {
				let lastTile = passed.pop() ?? getRandomTile();
				current = getTile(lastTile);
				generated.push(lastTile);
			} else {
				console.log("cur-" + current.index, "des-" + destinationTile.index, dir);
				getTile(current.index).bg = true;
				await new Promise((r) => setTimeout(r, pow(1.02, this.res * 2)));
				passed.push(destinationTile.index);
				getTile(current.index).bg = false;
				getTile(current.index).collide[dir] = false;
				getTile(destinationTile.index).collide[dir == "right" ? "left" : dir == "left" ? "right" : dir == "bottom" ? "top" : "bottom"] = false;
				current = destinationTile;
			}
			this.flattenTiles = _.flatten(this.tiles);
		}
		console.log(passed, generated, sort(_.concat(passed, generated)));
		game.state = "started";
	}
	render(vector) {
		this.flattenTiles.forEach((e) => {
			e.render(vector);
		});
	}
	renderCollision(vector) {
		if (this.flattenTiles.filter((e) => _.includes(e.collide, true)).length == 0) return;
		this.flattenTiles.forEach((e) => {
			e.renderCollision(vector);
		});
	}
}
class Tiles {
	constructor({ r = true, l = true, t = true, b = true, center = false, x = 0, y = 0, res = 64, index = false }) {
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
		this.bg = false;
		this.center = center;
	}
	render(vector) {
		let final = [(vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y];
		push();
		stroke(20);
		if (this.bg) {
			fill(rgb.r, rgb.g, rgb.b);
			rgbAnimate();
		} else {
			noFill();
		}
		strokeWeight(1).rect(final[0], final[1], this.res, this.res).fill(100);
		// text(this.index, final[0] - textWidth(this.index) * 0.5, final[1] + 5);
		pop();
	}
	renderCollision(vector) {
		let final = [(vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y];
		push();
		final[0] -= this.res * 0.5;
		final[1] -= this.res * 0.5;
		stroke(255);
		strokeWeight(2);
		if (this.collide.left) {
			line(final[0], final[1], final[0], final[1] + this.res);
		}
		if (this.collide.right) {
			line(final[0] + this.res, final[1], final[0] + this.res, final[1] + this.res);
		}
		if (this.collide.top) {
			line(final[0], final[1], final[0] + this.res, final[1]);
		}
		if (this.collide.bottom) {
			line(final[0], final[1] + this.res, final[0] + this.res, final[1] + this.res);
		}
		pop();
	}
}
