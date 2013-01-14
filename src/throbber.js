function Throbber(size, strokeColor) {
  'use strict';
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
  'use strict';
  if (!this.timer) {
    this.timer = window.setInterval(this._draw.bind(this), 10);
  }
  this.titleElem.html(msg);
  this.root.style.display = 'inline';
};

Throbber.prototype.update = function (msg) {
  'use strict';
  this.titleElem.html(msg);
};

Throbber.prototype.stop = function () {
  'use strict';
  window.clearInterval(this.timer);
  this.timer = 0;
  this.root.style.display = 'none';
};

Throbber.prototype._draw = function () {
  'use strict';
  this.context.save();
  this.context.clearRect(-this.size / 2, -this.size / 2, this.size, this.size);
  this.context.rotate(this.theta);
  this.context.beginPath();
  this.context.arc(0, 0, 6, 0, Math.PI / 1.5, false);
  this.context.stroke();
  this.context.restore();
  this.theta += Math.PI / 50;
};
