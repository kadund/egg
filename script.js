// Simple Egg Catcher game
// Controls: mouse move or left/right arrows to move basket
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');
  const overlayRestart = document.getElementById('overlay-restart');

  const W = canvas.width;
  const H = canvas.height;

  let game, inputX;

  class Basket {
    constructor(){
      this.width = 140;
      this.height = 28;
      this.x = (W - this.width) / 2;
      this.y = H - this.height - 14;
      this.speed = 8;
    }
    moveTo(x){
      // center the basket on x
      this.x = Math.max(8, Math.min(W - this.width - 8, x - this.width/2));
    }
    step(dir){
      this.x += dir * this.speed;
      this.x = Math.max(8, Math.min(W - this.width - 8, this.x));
    }
    draw(ctx){
      // basket body
      ctx.fillStyle = '#7b4f35';
      roundRect(ctx, this.x, this.y, this.width, this.height, 8, true, false);
      // basket rim
      ctx.fillStyle = '#a26b47';
      roundRect(ctx, this.x+6, this.y-8, this.width-12, 10, 6, true, false);
    }
  }

  class Egg {
    constructor(x, speed){
      this.x = x;
      this.y = -18;
      this.r = 12 + Math.random()*6;
      this.speed = speed;
      this.broken = false;
      this.caught = false;
      // slight horizontal swing
      this.swing = (Math.random()*2-1) * 0.5;
      this.phase = Math.random()*Math.PI*2;
    }
    update(dt){
      this.phase += dt * 0.004;
      this.x += Math.sin(this.phase) * this.swing;
      this.y += this.speed * dt * 0.02;
    }
    draw(ctx){
      // egg shape using ellipse
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.sin(this.phase)*0.05);
      // outer
      const grd = ctx.createLinearGradient(-this.r, -this.r, this.r, this.r);
      grd.addColorStop(0, '#fffbe6');
      grd.addColorStop(1, '#fff0cf');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.r*0.8, this.r, 0, 0, Math.PI*2);
      ctx.fill();
      // slight shadow
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.beginPath();
      ctx.ellipse(0, this.r*0.35, this.r*0.6, this.r*0.35, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    if (typeof r === 'number') r = {tl: r, tr: r, br: r, bl: r};
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function Game(){
    this.basket = new Basket();
    this.eggs = [];
    this.score = 0;
    this.lives = 3;
    this.running = false;
    this.spawnTimer = 0;
    this.spawnInterval = 900; // ms
    this.difficultyTimer = 0;
    this.lastTime = performance.now();
    this.keyLeft = false;
    this.keyRight = false;
  }

  Game.prototype.reset = function(){
    this.eggs = [];
    this.score = 0;
    this.lives = 3;
    this.spawnTimer = 0;
    this.spawnInterval = 900;
    this.difficultyTimer = 0;
    scoreEl.textContent = this.score;
    livesEl.textContent = this.lives;
  }

  Game.prototype.start = function(){
    this.reset();
    this.running = true;
    this.lastTime = performance.now();
    overlay.classList.add('hidden');
    restartBtn.style.display = 'inline-block';
    startBtn.style.display = 'none';
    requestAnimationFrame(this.frame.bind(this));
  }

  Game.prototype.end = function(){
    this.running = false;
    overlay.classList.remove('hidden');
    overlayTitle.textContent = 'Game Over';
    overlayMsg.textContent = `Score: ${this.score}`;
    overlayRestart.focus();
  }

  Game.prototype.spawnEgg = function(){
    const margin = 24;
    const x = margin + Math.random() * (W - margin*2);
    // speed base + scale with score/difficulty
    const base = 1.8 + Math.min(4.0, 0.15 * Math.sqrt(this.score+1));
    const rand = base + Math.random()*1.6;
    this.eggs.push(new Egg(x, rand));
  }

  Game.prototype.update = function(now){
    const dt = Math.min(40, now - this.lastTime); // cap dt for stability
    this.lastTime = now;

    // input
    if (inputX !== undefined && inputX !== null) {
      this.basket.moveTo(inputX);
    }
    if (this.keyLeft) this.basket.step(-1);
    if (this.keyRight) this.basket.step(1);

    // spawn logic
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEgg();
      // slowly reduce interval with difficulty
      this.spawnInterval = Math.max(420, this.spawnInterval * 0.985);
    }

    this.difficultyTimer += dt;

    // update eggs
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const e = this.eggs[i];
      e.update(dt);
      // caught?
      if (!e.caught && e.y + e.r >= this.basket.y) {
        if (e.x > this.basket.x && e.x < this.basket.x + this.basket.width) {
          e.caught = true;
          this.score += 10;
          scoreEl.textContent = this.score;
          // remove egg (play catch animation maybe)
          this.eggs.splice(i,1);
          continue;
        }
      }
      if (e.y - e.r > H) {
        // egg hit the ground -> lose life
        this.eggs.splice(i,1);
        this.lives -= 1;
        livesEl.textContent = this.lives;
        if (this.lives <= 0) {
          this.end();
          return;
        }
      }
    }
  }

  Game.prototype.draw = function(){
    // clear
    ctx.clearRect(0,0,W,H);

    // ground / background elements
    // draw a simple horizon and grass
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, H-60, W, 60);

    // eggs
    for (const e of this.eggs) e.draw(ctx);

    // basket
    this.basket.draw(ctx);

    // optional small score text on canvas
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Score ${this.score}`, 10, 16);
  }

  Game.prototype.frame = function(now){
    if (!this.running) return;
    this.update(now);
    this.draw();
    requestAnimationFrame(this.frame.bind(this));
  }

  // input handlers
  function setupInput(game){
    // mouse move
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      inputX = x;
    });
    canvas.addEventListener('touchmove', (e) => {
      if (!e.touches.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      inputX = x;
      e.preventDefault();
    }, {passive:false});

    // keyboard
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') game.keyLeft = true;
      if (e.key === 'ArrowRight') game.keyRight = true;
      if (e.key === ' ' && !game.running) game.start();
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') game.keyLeft = false;
      if (e.key === 'ArrowRight') game.keyRight = false;
    });

    // start / restart buttons
    startBtn.addEventListener('click', () => game.start());
    restartBtn.addEventListener('click', () => game.start());
    overlayRestart.addEventListener('click', () => {
      overlay.classList.add('hidden');
      game.start();
    });
  }

  // init
  game = new Game();
  setupInput(game);

  // initial draw
  game.draw();
})();
