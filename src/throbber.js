(function (global) {
  'use strict';

  function Throbber(size, strokeColor) {
    this.size = size;
    this.canvasElem = $.make('canvas').attr('width', size).attr('height', size);
    this.context = this.canvasElem.getContext('2d');
    this.titleElem = $.make('.throbber-title');
    this.root = $.make('.throbber', null, { display: 'none' })
      .append(this.canvasElem)
      .append(this.titleElem);
    this.theta = 0;
    this.timer = 0;

    this.context.strokeStyle = strokeColor || '#ACE';
    this.context.lineWidth = 3;
    this.context.lineCap = 'round';
    this.context.translate(size / 2, size / 2);
  }

  Throbber.prototype.start = function (msg) {
    if (!this.timer) {
      this.timer = setInterval(this._draw.bind(this), 10);
    }
    this.titleElem.html(msg);
    this.root.style.removeProperty('display');
  };

  Throbber.prototype.update = function (msg) {
    this.titleElem.html(msg);
  };

  Throbber.prototype.stop = function () {
    clearInterval(this.timer);
    this.timer = 0;
    this.root.style.display = 'none';
  };

  Throbber.prototype._draw = function () {
    this.context.save();
    this.context.clearRect(-this.size / 2, -this.size / 2, this.size, this.size);
    this.context.rotate(this.theta);
    this.context.beginPath();
    this.context.arc(0, 0, (this.size - 3) / 2, 0, Math.PI / 1.5, false);
    this.context.stroke();
    this.context.restore();
    this.theta += Math.PI / 50;
  };

  global.Throbber = Throbber;
}) (window);
