$(document).ready( function() { Main.main(); });

// POINT - a point in the plane
// Takes coordinates x,y as inputs.
Point = function(x,y) {
    this.x = x;
    this.y = y;
}

Point.prototype = {
    constructor: Point,

    plus: function(p2){
        this.x += p2.x;
        this.y += p2.y;
        return this
    },

    minus: function(p2) {
        this.x -= p2.x;
        this.y -= p2.y;
        return this
    },

    times: function(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this
    },

    rotate: function(theta) {
        var f = Math.cos(theta);
        var e = Math.sin(theta);
        this.x = this.x*f - this.y*e;
        this.y = this.x*e + this.y*f;
        return this
    },

    angle: function() {
        return Math.atan2(this.y, this.x)
    },

    clone: function(){
        return new Point(this.x,this.y)
    }
}


// VECTOR - used as sides to the tiles.
// Vectors have a start point (x0,y0), an end point (xf,yf)
// and a matching condition (integer)
Vector = function(start,end,match) {
    this.start = start;
    this.end = end;
    this.match = match
}


// Vector.prototype = {
//     constructor:Vector,
// };


// Math Functions
function properAngle(theta) {
    while(theta <= -Math.PI) {theta += 2*Math.PI}
    while(theta>Math.PI) {theta -= 2*Math.PI}
    return theta
}


// GLOBALS
PHI = (1 + Math.sqrt(5))/2;

// Tile properties
bigRhombProps = {
    color: "#b0e0e6",
    matching: [2, 1, -1, -2],
    angles: [72, 108, 72,108],
    sidelens: [100, 100, 100, 100]
};
lilRhombProps = {
    color: "#006565",
    matching: [1, -1, 2, -2],
    angles: [36, 144, 36, 144],
    sidelens: [100, 100, 100, 100]
};
kiteProps = {
    color: "#b0e0e6",
    matching: [-1, 1, 2, -2],
    angles: [144, 72, 72, 72],
    sidelens: [100, 100*PHI, 100*PHI, 100]  // TODO: sidelengths....
};
dartProps = {
    color: "#006565",
    matching: [2, -2, 1, -1],
    angles: [72, 36, 216, 36],
    sidelens: [100*PHI, 100, 100, 100*PHI]  // TODO: sidelengths....
};


// function Tile(type, startCornerIdx, startCornerPoint, theta) = {
function Tile(type, startIdx, offset, theta) {
    this.corners =  Array(4); // Coordinates of the corners
    this.matching = Array(4); // Two tiles' sides match if these sum to zero
    this.type = type;
    this.color = null;
    this.startIdx = startIdx;

    switch(type) {
        case"kite":
            var props = kiteProps;
            break;
        case"dart":
            var props = dartProps;
            break;
        case "bigRhomb":
            var props = bigRhombProps;
            break;
        case"lilRhomb":
            var props = lilRhombProps;
            break;
    };

    this.color = props.color;
    this.matching = props.matching;

    this.corners[startIdx] = offset.clone();

    for(var j=1; j<4; j++) {
        var i = (j + startIdx) % 4;
        var iPrev = (j + startIdx - 1) % 4;

        // set point i
        var sidelen = props.sidelens[iPrev];
        this.corners[i] = this.corners[iPrev].clone();
        var relPt = new Point(Math.cos(theta), Math.sin(theta));
        relPt.times(sidelen);
        this.corners[i].plus(relPt);

        // Increment angle and sidelen
        theta += Math.PI  * (1 - props.angles[i] / 180);
    }
};


// Collection of tiles
tiling = {
    tiles: [],
    border: [],

    clear: function() {
        this.tiles = [];
        this.border = {};
    },

    add: function(tile) {
        this.tiles.push(tile);
    }
};


// Driver
Main = {
    canvas: null,
    ctx: null,

    main: function() {
        this.canvas = document.getElementById("cnv")
        this.ctx = this.canvas.getContext("2d");
        this.startMouse();

        // Buttons
        $("#kite").click( function() {Main.startKite()});
        $("#dart").click( function() {Main.startDart()});
        $("#bigRhomb").click( function() {Main.startBigRhomb()});
        $("#lilRhomb").click( function() {Main.startLilRhomb()});
        $("#zoomIn").click( function() {Main.zoomIn()});
        $("#zoomOut").click( function() {Main.zoomOut()});
        $("#inflate").click( function() {Main.inflate()});
        $("#deflate").click( function() {Main.deflate()});
    },

    // CONFIGURE MOUSE

    getMousePos: function(a) {
        a.preventDefault();
        var d = $(this.canvas).offset();
        var c = a.clientX-d.left + window.pageXOffset;
        var b = a.clientY-d.top + window.pageYOffset;
        return new Point(c,b)
    },

    startMouse: function() {
        var a = this.canvas;

        a.addEventListener("mousedown",
            function(c) {
                var b = Main.getMousePos(c);
                Main.mouseDown(b,c)},
            false
        );

        a.addEventListener("mousemove",
            function(c){
                var b = Main.getMousePos(c);
                Main.mouseMove(b,c)},
            false)
    },

    mouseIsDown: false,
    lastPos:null,

    mouseDown: function(c,b) {
        MouseUpCapture.start(
            function(e){
                var d = Main.getMousePos(e.originalEvent);
                Main.mouseUp(d,e.originalEvent)});
        MouseMoveCapture.start(
            function(e){
                var d = Main.getMousePos(e.originalEvent);
                Main.mouseMove(d,e.originalEvent)});
        this.mouseIsDown = true;
        this.lastPos = c;
        switch(this.tool) {
            case"pen":this.penClick(c);
                break;
            case"fill":this.fillClick(c);
                break;
            default: var a = this.findMouseTarget(c);
                if(a) {EngineController.startAndCommit(a)}
        }
    },

    mouseUp: function(b,a){ this.mouseIsDown = false},

    overTarget:null,

    mouseMove: function(c,b){
        if(this.tool == "add") {
            var a = this.findMouseTarget(c);
            if(a!= this.overTarget) {
                if(this.overTarget) {
                    EngineController.maybeStop(this.overTarget)
                }
                if(a) {
                    EngineController.maybeStart(a)}this.overTarget = a
            } else {
                if(this.mouseIsDown) {
                    drawOffset.sub(this.lastPos).add(c);
                    this.draw()
                }
            }
        }
        this.lastPos = c
    },

    findMouseTarget: function(c){
        for( var b in this.targets) {
            var a = this.targets[b];
            if(a.hit(c.x,c.y)) {return a}
        }
        return null;
    },

    // BUTTONS

    startKite: function() {
        tiling.clear();
        startPt = new Point(this.canvas.width/2, this.canvas.height/2);
        this.addTile(new Tile("kite", 0, startPt, Math.PI*18/180));
    },

    startDart: function() {
        tiling.clear();
        startPt = new Point(this.canvas.width/2, this.canvas.height/2);
        this.addTile(new Tile("dart", 0, startPt, Math.PI*54/180));
    },

    startBigRhomb: function() {
        tiling.clear();
        startPt = new Point(this.canvas.width/2, this.canvas.height/2);
        this.addTile(new Tile("bigRhomb", 0, startPt, Math.PI*54/180));
    },

    startLilRhomb: function() {
        tiling.clear();
        startPt = new Point(this.canvas.width/2, this.canvas.height/2);
        this.addTile(new Tile("lilRhomb", 0, startPt, Math.PI*72/180));
    },

    scale: function(factor) {
        var a = new Point(this.canvas.width/2,this.canvas.height/2);

        for(idx in tiling.tiles) {
            tile = tiling.tiles[idx];
            for(var j=0; j<4; j++) {
                tile.corners[j].minus(a);
                tile.corners[j].times(factor);
                tile.corners[j].plus(a);
            }
        }

        // Scale sidelengths
        for(var i=1; i<4; i++) {
            kiteProps.sidelens[i] *= factor;
            dartProps.sidelens[i] *= factor;
            bigRhombProps.sidelens[i] *= factor;
            lilRhombProps.sidelens[i] *= factor;
        }

        this.render()
    },

    zoomIn: function() {
        this.scale(1.25);
    },

    zoomOut: function() {
        this.scale(0.8);
    },

    deflate: function() {
        return;
    },

    // HELPER FUNCTIONS

    addTile: function(tile) {
        tiling.add(tile);
        this.render();
    },

    // RENDER TILING

    drawVector: function(vec) {
        this.ctx.beginPath();
        this.ctx.moveTo(vec.start.x, vec.start.y);
        this.ctx.lineTo(vec.end.x, vec.end.y);
        this.ctx.stroke();
    },

    drawTile: function(tile) {
        this.ctx.beginPath();
        this.ctx.moveTo(tile.corners[0].x, tile.corners[0].y);
        for(var b=0; b<4; b++) {
            this.ctx.lineTo(tile.corners[b].x, tile.corners[b].y)
        }
        this.ctx.lineTo(tile.corners[0].x, tile.corners[0].y)

        this.ctx.fillStyle = tile.color;
        this.ctx.fill();
        this.ctx.strokeStyle = "#000";
        this.ctx.stroke()
    },

    render: function() {
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        // fill in tiles
        for(var b in tiling.tiles) {
            console.log("Rendering tile " + b)
            this.drawTile(tiling.tiles[b])
        }
        // draw vectors
        for(var a in tiling.vectors) {
            v = tiling.vectors[a]
            this.drawVector(v)
        }
        // TODO: add expand tiling options
    }
}
