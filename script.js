let game;
let currentFPS = 0;
let rgb = {
	r: 200,
	g: 0,
	b: 0,
};
const pickr = Pickr.create({
	el: ".color-picker",
	theme: "nano",
	default: localStorage.color ?? "red",
	useAsButton: true,
	components: {
		preview: true,
		hue: true,
		interaction: {
			input: true,
		},
	},
});
function rgbAnimate() {
	let state = [rgb.r == 200, rgb.g == 200, rgb.b == 200];
	if (!_.includes(state, true)) return;
	gsap.to(rgb, { r: state[2] ? 200 : 0, g: state[0] ? 200 : 0, b: state[1] ? 200 : 0, duration: 1 });
} //! animate generator head
function preload() {} //* preload

function setup() {
	createCanvas(500, 500); //* create the canvas
	frameRate(60); //* set frame rate to 60FPS
	game = new Game({ res: 48 }); //* initialize Game class in game
} //! setup

function draw() {
	background(0); //* draw background
	renderFPS(); //* render the FPS counter
	game.render(); //* render the game
	if (game.state == "over" && frameCount % 60 == 0) {
		game = new Game({ res: 48 });
	}
}
function renderFPS() {
	if (frameCount % 10 == 0) {
		if (localStorage.color != pickr.getColor().toHEXA().toString()) {
			localStorage.setItem("color", pickr.getColor().toHEXA().toString());
		}
		currentFPS = round(frameRate());
	}
	push();
	fill(255).noStroke().strokeWeight(0).text(currentFPS, 10, 20);
	pop();
} //! FPS counter
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
} //! key driver

class Game {
	constructor({ res = 48, radius }) {
		this.res = res;
		this.radius = _.isInteger(radius)
			? abs(radius + (radius % 2 == 0 ? 1 : 0))
			: (this.res > 64 ? 4 : this.res >= 48 ? 8 : this.res >= 32 ? 12 : this.res >= 16 ? 16 : this.res >= 8 ? 32 : 64) + 1;
		this.map = new Map({ res: this.res, radius: this.radius });
		this.player = new Player({ res: this.res, radius: this.radius, tile: _.filter(_.flatten(this.map.tiles), { center: true }) });
		this.cam = new Camera();
		this.state = "preparation"; //* "preparation" "prepare" "started" "over"
		this.difficulty = 1;
	}
	render() {
		this.cam.render(this.player, this.map); //* render the camera
	}
} //! game class who wrapped everything
class Camera {
	constructor() {
		this.anchor = createVector(width * 0.5, height * 0.5);
		this.onanimation = false;
		this.tilt = createVector(0, 0); //* the addition to make all object center from the canvas
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
		} //* update tilt if player moves, every 5 frames
		push();
		rectMode(CENTER);
		mapInstance.render(this.tilt); //* render map with the tilt
		playerInstance.render(this.tilt); //* render the player with tilt
		mapInstance.renderCollision(this.tilt); //* render the collision with tilt
		pop();
	}
}
class Player {
	constructor({ res = 64, radius, tile }) {
		this.ontile = (tile.length && tile.length > 1) || tile ? tile[0] : undefined;
		this.res = res;
		this.radius = radius;
		this.pos = createVector(this.ontile.pos.x, this.ontile.pos.y);
		this.queue = [];
		this.moving = false;
	}
	render(vector) {
		push();
		fill(pickr.getColor().toHEXA().toString())
			.noStroke()
			.rect((vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y, this.res, this.res);
		pop();
		if (!this.moving && this.queue.length) {
			this.moving = true;
			let dir = this.queue.shift();
			let newIndex = this.ontile.index + this.radius * dir[1] + dir[0];
			let destination = _.flatten(game.map.tiles)[newIndex];
			if (
				newIndex < 0 || //* index more than 0
				newIndex > _.flatten(game.map.tiles).length - 1 || //* index less than tiles amount
				(floor(this.ontile.index / this.radius) == 0 && dir[1] < 0) || //* top map collision so it's not overlap
				(ceil(this.ontile.index / this.radius) == this.radius && dir[1] > 0) || //* bottom map collision so it's not overlap
				(this.ontile.index % this.radius == 0 && dir[0] < 0) || //* left map collision so it's not overlap
				(this.ontile.index % this.radius == this.radius - 1 && dir[0] > 0) || //* right map collision so it's not overlap
				game.state != "started" || //* game state check
				(dir[0] > 0 && (destination.collide.left || this.ontile.collide.right)) || //* right collision
				(dir[0] < 0 && (destination.collide.right || this.ontile.collide.left)) || //* left collision
				(dir[1] > 0 && (destination.collide.top || this.ontile.collide.bottom)) || //* bottom collision
				(dir[1] < 0 && (destination.collide.bottom || this.ontile.collide.top)) //* top collision
			) {
				newIndex = this.ontile.index; //* if it's in, change newIndex to it's current tile so player didn't move
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
						if (this.ontile.finishLine) {
							game.state = "over";
						}
					},
				}); //* player moving animation
			}
		}
	}
	move(x = 0, y = 0) {
		this.queue.push([x, y]);
	} //* to move
} // !player class
class Map {
	constructor({ res = 64, radius }) {
		this.res = res; //* resolution of tile
		this.tiles = []; //* tiles
		this.radius = radius;
		let finishLine = [round(random(0, 1)) == 0 ? 0 : this.radius - 1, round(random(0, 1)) == 0 ? 0 : this.radius - 1];
		for (let i = 0; i < this.radius; i++) {
			let row = [];
			for (let u = 0; u < this.radius; u++) {
				row.push(
					new Tiles({
						index: i * this.radius + u,
						finishLine: i * this.radius + u == finishLine[0] * this.radius + finishLine[1],
						res: this.res,
						x: u * this.res,
						y: i * this.res,
						center: (pow(this.radius, 2) - 1) * 0.5 == i * this.radius + u,
					})
				);
			}
			this.tiles.push(row);
		} //* initialize tiles
		this.flattenTiles = _.flatten(this.tiles); //* flat tile
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
		}); //* reset the value
		this.flattenTiles = _.flatten(this.tiles); //* update the flat tile
		let getDirection = ({ r = false, l = false, t = false, b = false }) => {
			let availableIndex = [];
			if (!r) availableIndex.push("right");
			if (!l) availableIndex.push("left");
			if (!t) availableIndex.push("top");
			if (!b) availableIndex.push("bottom");
			return availableIndex[_.floor(_.random(0, availableIndex.length - 1))];
		}; //! to get random direction from a path
		let checkPath = (tile) => {
			return {
				r: _.includes(_.concat(passed, generated), tile.index + 1) || current.index % this.radius == this.radius - 1,
				l: _.includes(_.concat(passed, generated), tile.index - 1) || current.index % this.radius == 0,
				b: _.includes(_.concat(passed, generated), tile.index + this.radius) || ceil((current.index + 1) / this.radius) == this.radius,
				t: _.includes(_.concat(passed, generated), tile.index - this.radius) || floor(current.index / this.radius) == 0,
			};
		}; //! to check the possible direction the generator go
		let getRandomTile = () => {
			if (generated.length == 0) return;
			let picked = generated[_.random(generated.length - 1, false)];
			let pickedTile = getTile(picked);
			let pickedPath = checkPath(pickedTile);
			return _.includes(pickedPath, false) ? picked : getRandomTile();
		}; //! to get random tile who has been generated
		let getTile = (index) => this.tiles[floor(index / this.radius)][index % this.radius]; //! get the tile from index
		let passed = [game.player.ontile.index]; //* passed tile
		let generated = []; //* generated tile
		let generating = true;
		let current = game.player.ontile; //* current tile where head of generator in
		while (generating) {
			generated = _.union(generated); //* removes the duplicated value
			passed = _.union(passed); //* removes the duplicated value
			generating = generated.length + passed.length != this.flattenTiles.length;
			let path = checkPath(current);
			let dir = getDirection(path);
			let destinationTile = this.flattenTiles[current.index + (dir == "right" ? 1 : dir == "left" ? -1 : dir == "bottom" ? this.radius : dir == "top" ? -this.radius : 0)];
			if ((_.random(generated.length + passed.length < 10 ? 1 : 2, false) == 0 && generated.length + passed.length != 0) || !_.includes(path, false)) {
				//* if no possible path detected or randomly true, go back 1 tile
				let lastTile = passed.pop() ?? getRandomTile();
				current = getTile(lastTile);
				generated.push(lastTile);
			} else {
				//* generate the next tile
				getTile(current.index).bg = true;
				await new Promise((r) => setTimeout(r, round(1000 / (this.radius * 1.5)))); //* the pause
				passed.push(destinationTile.index);
				getTile(current.index).bg = false;
				getTile(current.index).collide[dir] = false;
				getTile(destinationTile.index).collide[dir == "right" ? "left" : dir == "left" ? "right" : dir == "bottom" ? "top" : "bottom"] = false;
				current = destinationTile;
			}
			this.flattenTiles = _.flatten(this.tiles);
		} //! loop for generating
		game.state = "started"; //* when the loop end, start the game
	}
	render(vector) {
		this.flattenTiles.forEach((e) => {
			e.render(vector);
		});
	} //* render the tiles
	renderCollision(vector) {
		if (this.flattenTiles.filter((e) => _.includes(e.collide, true)).length == 0) return;
		this.flattenTiles.forEach((e) => {
			e.renderCollision(vector);
		});
	} //* render the tiles collision
} //! map class
class Tiles {
	constructor({ r = true, l = true, t = true, b = true, center = false, x = 0, y = 0, res = 64, finishLine = false, index = false }) {
		if (index != undefined) {
			this.index = index;
		}
		this.pos = createVector(x, y);
		this.finishLine = finishLine;
		this.res = res;
		this.collide = {
			right: r,
			left: l,
			top: t,
			bottom: b,
		};
		this.bg = false;
		this.center = center;
		this.opacity = {
			value: 1,
		};
		this.onAnimation = false;
	}
	getCoord() {
		let coord = [this.index % game.radius, floor(this.index / game.radius)];
		return [...coord, coord.reduce((acc, cur) => acc + cur)];
	}
	render(vector) {
		let final = [(vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y];
		push();
		stroke(game.vignette ? 0 : 10);
		if (this.bg) {
			fill(`rgba(${round(rgb.r)},${round(rgb.g)},${round(rgb.b)},${this.opacity.value})`);
			rgbAnimate();
		} else if (this.finishLine) {
			fill(`rgba(0,0,255,${this.opacity.value})`);
		} else {
			noFill();
		}
		strokeWeight(1);
		if (game?.vignette && frameCount % 5 == 0 && !this.onAnimation) {
			this.onAnimation = true;
			let coord = this.getCoord();
			let desCood = game.player.ontile.getCoord();
			let distance = abs(desCood[0] - coord[0]) + abs(desCood[1] - coord[1]);
			distance -= distance == 0 ? 0 : 1;
			let mult = 1 - distance * 0.2;
			let tooFar = mult < 0 || abs(desCood[0] - coord[0]) >= 4 || abs(desCood[1] - coord[1]) >= 4;
			let opac = round(tooFar ? 0 : mult > 1 ? 1 : mult, 2);
			if (this.opacity.value != opac) {
				gsap.to(game.map.tiles[coord[1]][coord[0]].opacity, {
					value: opac,
					duration: 0.2,
					onComplete() {
						game.map.tiles[coord[1]][coord[0]].onAnimation = false;
						game.map.flattenTiles = _.flatten(game.map.tiles);
					},
				});
			} else {
				this.onAnimation = false;
			}
		} //* vignette effect
		rect(final[0], final[1], this.res, this.res);
		// fill(100).text(this.index, final[0] - textWidth(this.index) * 0.5, final[1] + 5);
		pop();
	} //* tile
	renderCollision(vector) {
		let final = [(vector.x ?? 0) + this.pos.x, (vector.y ?? 0) + this.pos.y];
		push();
		final[0] -= this.res * 0.5;
		final[1] -= this.res * 0.5;
		stroke(255 * this.opacity.value);
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
	} //* tile collision
} //! tile class
