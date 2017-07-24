//==============================================================================
// Author: Nergal
// Date: 2015-11-10
//==============================================================================
const CHUNK_WORLD = 0;
const CHUNK_OBJECT = 1;
const CHUNK_FF = 2;
// Binary string to decimal conversion
String.prototype.bin = function () {
    return parseInt(this, 2);
};

// Decimal to binary string conversion
Number.prototype.bin = function () {
    var sign = (this < 0 ? "-" : "");
    var result = Math.abs(this).toString(2);
    while(result.length < 32) {
        result = "0" + result;
    }
    return sign + result;
}

function Chunk() {
    this.mesh = undefined;
    this.blocks = 0;
    this.triangles = 0;
    this.dirty = false;
    this.fromX = 0;
    this.fromY = 0;
    this.fromZ = 0;
    this.toX = 0;
    this.toY = 0;
    this.toZ = 0;
    this.x = 0;
    this.y = 0; 
    this.z = 0;
    this.type = 0; // 0 = world, 1 = object
    this.blockList = 0;
};


function World() {
    this.worldSize = 192;
    this.chunkBase = 16;
    this.worldDivBase = this.worldSize/this.chunkBase;
    this.chunkHeight = 160;
    this.blocks = 0;
    this.blockSize = 1;
    this.material = 0;
    this.chunks = undefined;
    this.plane = 0; // bottom ground

    this.ffTime = 0;

    this.last = 0; // Used for flood fill

    this.floodFill = new Array();

    // Debug stuff
    this.wireframe = false;
    this.showChunks = false;


    World.prototype.Init = function() {

        // Initiate blocks
        this.blocks = new Array();
        for(var x = 0; x < this.worldSize; x++) {
            this.blocks[x] = new Array();
            for(var y = 0; y < this.chunkHeight; y++) {
                this.blocks[x][y] = new Array();
                for(var z = 0; z < this.worldSize; z++) {
                    this.blocks[x][y][z] = 0;
                }
            }
        }

        this.chunks = new Array(this.worldDivBase);
        for (var x = 0; x < this.worldDivBase; x++) {
            this.chunks[x] = new Array(this.worldDivBase);
            for (var z = 0; z < this.worldDivBase; z++) {
                this.chunks[x][z] = new Chunk();
                this.chunks[x][z].type = 0; // world
                this.chunks[x][z].fromY = 0;
                this.chunks[x][z].toY = this.chunkHeight;
                this.chunks[x][z].fromX = x*this.blockSize*this.chunkBase;
                this.chunks[x][z].toX = x*this.blockSize*this.chunkBase + this.chunkBase;
                this.chunks[x][z].fromZ = z*this.blockSize*this.chunkBase;
                this.chunks[x][z].toZ = z*this.blockSize*this.chunkBase + this.chunkBase;
                this.chunks[x][z].x = x;
                this.chunks[x][z].z = z;
                if(this.showChunks) {
                    var mat = new THREE.MeshBasicMaterial({color: 0xAA4444, wireframe: true});
                    var geo = new THREE.BoxGeometry(
                        this.chunkBase*this.blockSize,
                        this.chunkHeight*this.blockSize,
                        this.chunkBase*this.blockSize
                    );

                    var mesh = new THREE.Mesh(geo, mat);
                    mesh.position.x = x*this.blockSize*this.chunkBase + this.chunkBase*this.blockSize/2;
                    mesh.position.z = z*this.blockSize*this.chunkBase + this.chunkBase*this.blockSize/2;
                    mesh.position.y = this.blockSize*this.chunkHeight/2;
                    game.scene.add(mesh);
                }
            }
        }

        // Add ground plate
        // TOP
        var col = 0x444444;
        var geo = new THREE.BoxGeometry(this.blockSize*this.worldSize - 2, 1, this.blockSize*this.worldSize-7);
        var mat = new THREE.MeshBasicMaterial({color: col});
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((this.worldSize/2-this.chunkBase/2), -1/2+1, this.worldSize/2-this.chunkBase/2 + 2);
        mesh.receiveShadow = true;
        game.scene.add(mesh);
        // base
        var geo = new THREE.BoxGeometry(this.blockSize*this.worldSize - 2, 1000, this.blockSize*this.worldSize-7);
        var mat = new THREE.MeshBasicMaterial({color: col});
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((this.worldSize/2-this.chunkBase/2), -1000/2, this.worldSize/2-this.chunkBase/2 + 2);
        game.scene.add(mesh);

        this.RebuildMaterial(false);
    };

    World.prototype.RebuildMaterial = function(wireframe) {
        this.wireframe = wireframe;
        this.material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors, wireframe: this.wireframe});
//this.material = new THREE.MeshPhongMaterial( {
//					color: 0xaaaaaa, specular: 0xffffff, shininess: 250,
//			side: THREE.SingleSide, vertexColors: THREE.VertexColors
//} );
        
    };

    World.prototype.PlaceObject = function(x,y,z, chunk) {
        for (var i = 0; i < chunk.blockList.length; i++) {
            chunk.mesh.updateMatrixWorld();
            var b = chunk.blockList[i];
            var vector = new THREE.Vector3(b.x,b.y,b.z);
            vector.applyMatrix4( chunk.mesh.matrixWorld );
            var xi = vector.x+game.world.blockSize*8 | 0;
            var yi = vector.y | 0;
            var zi = vector.z+game.world.blockSize*8 | 0;
            // TBD: Solves some issues with placement.
            if(yi <= 0) {
                yi = 1; 
            }
            if(this.IsWithinWorld(xi,yi,zi)) {
                this.blocks[xi][yi][zi] = b.val;
                // If player is hit by object, kill him (if the object is larger than 200 blocks)
                if(chunk.blockList.length > 200) {
                    var px = (game.player.mesh.position.x+this.blockSize*8)|0;
                    var py = (game.player.mesh.position.y+this.blockSize*8)|0;
                    var pz = (game.player.mesh.position.z+this.blockSize*8)|0;
                    if(px == xi && py == yi && pz == zi) {
                        game.player.Die();
                    }
                }
                this.GetChunk(xi, zi).dirty = true;
            }
        }
        this.RebuildDirtyChunks();
    };

    World.prototype.IsWithinWorld = function(x,y,z) {
            if(x > 0 && x < game.world.worldSize - 1 &&
               y > 0 && y < game.world.chunkHeight - 1 &&
               z > 4 && z < game.world.worldSize - 1) {
                return true;
            }
            return false;
    };

    World.prototype.Explode = function(x,y,z, power, onlyExplode) {
        // Remove blocks.
        this.exploded = 1;
        var pow = power*power;
        var blockList = new Array();
        for(var rx = x+power; rx >= x-power; rx--) {
            for(var rz = z+power; rz >= z-power; rz--) {
                for(var ry = y+power; ry >= y-power; ry--) {
                    val = (rx-x)*(rx-x)+(ry-y)*(ry-y)+(rz-z)*(rz-z);
                    if(val <= pow) {
                        this.RemoveBlock(rx,ry,rz);

                        // TBD: Temp solution for player death...
                        var px = (game.player.mesh.position.x+this.blockSize*8)|0;
                        var py = (game.player.mesh.position.y-this.blockSize*8)|0;
                        var pz = (game.player.mesh.position.z+this.blockSize*8)|0;
                        if(px == rx && py == ry && pz == rz) {
                            game.player.Die();
                        }
                    } else if(val > pow)  {
                        if(this.IsWithinWorld(rx,ry,rz)) {
                            if((this.blocks[rx][ry][rz] >> 8) != 0) {
                                blockList.push(new THREE.Vector3(rx, ry, rz));
                               // this.blocks[rx][ry][rz] = (Math.round(Math.random()*225) & 0xFF) << 24 | (255 & 0xFF) << 16 | (255 & 0xFF) << 8;
                            }
                        }
                    }
                    if(val <= pow/10) {
                        this.ExplosionBlock(rx,ry,rz);
                        if(lfsr.rand()>0.8) {
                            this.SmokeBlock(rx,ry,rz);
                        }
                    }
                }
            }
        }
        this.RebuildDirtyChunks();
        if(!onlyExplode) {
            this.floodFill.push(blockList);
//            this.RemoveHangingBlocks(blockList);
        }
    };

    World.prototype.DrawStats = function() {
       var vblocks = 0,blocks = 0;
       var vtriangles = 0, triangles = 0;
       var vchunks=0, chunks = 0;
       for(var x = 0; x < this.chunks.length; x++) {
           for(var z = 0; z < this.chunks.length; z++) {
               if(this.chunks[x][z].mesh != undefined) {
                   if(this.chunks[x][z].mesh.visible) {
                       vblocks += this.chunks[x][z].blocks;
                       vtriangles += this.chunks[x][z].triangles;
                       vchunks++;
                   }
                   blocks += this.chunks[x][z].blocks;
                   triangles += this.chunks[x][z].triangles;
                   chunks++;                  
               }
           }
       }
       // TBD: This should not be here...
       var phys_stat = game.phys.Stats();
       $('#blockstats').html("[Total] Blocks: "+blocks + " Triangles: "+triangles+  " Chunks: "+chunks+"<br>"+
                            "[Visible] Blocks: "+vblocks + " Triangles: "+vtriangles + " Chunks: "+vchunks+"<br>"+
                            "[Particle Engine] Free: "+phys_stat.free+ "/"+phys_stat.total);
                
    }; 


    World.prototype.RebuildDirtyChunks = function(buildAll) {
        for(var x = 0; x < this.chunks.length; x++) {
            for(var z = 0; z < this.chunks.length; z++) {
                if(buildAll == 1 || this.chunks[x][z].dirty == true) {
                    this.RebuildChunk(this.chunks[x][z]);
                    //this.RebuildChunk(this.chunks[x][z].fromX, this.chunks[x][z].fromZ);
                }
            }
        }
    };

    World.prototype.Draw = function(time, delta) {
        if((this.ffTime+=delta) > 0.1) {
            if(this.floodFill.length > 0 && this.exploded != 1) {
                this.RemoveHangingBlocks(this.floodFill.pop());
            }
            this.ffTime = 0;
        }
       this.DrawStats();
       this.exploded = 0;
    };

    World.prototype.componentToHex = function(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };

    World.prototype.rgbToHex = function(r, g, b) {
        if(r < 0) r = 0;
        if(g < 0) g = 0;
        var hex = this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
        return parseInt('0x'+hex.substring(0, 6));
    };

    World.prototype.GetChunk = function(x,z) {
        var posx = parseInt(x  / (this.chunkBase));
        var posz = parseInt(z  / (this.chunkBase));
        if(posx < 0 || posz < 0 ) {
            return undefined;
        }
        return this.chunks[posx][posz];
    };


    World.prototype.RemoveHangingBlocks = function(blocks) {
        var newChunks = new Array();
        var removeBlocks = new Array();
        var all = new Array();
        for(var i = 0; i < blocks.length; i++) {
            var p = blocks[i];
            //this.blocks[p.x][p.y][p.z] = (25 & 0xFF) << 24 | (255 & 0xFF) << 16 | (0 & 0xFF) << 8 | this.blocks[p.x][p.y][p.z] & 0xFF;
            var ff = this.FloodFill(p);
            all.push(ff.all);
            if(ff.result != true) {
                if(ff.vals.length == 0) {
                    continue;
                }
                //if(ff.vals.length <= ) {
                //    removeBlocks.push(ff);
                //} else {
                    newChunks.push(ff);
                //}
            }
        }

        for(var m = 0; m < newChunks.length; m++) {
            var ff = newChunks[m];
            // Create chunk 
            var chunk = new Chunk();
            chunk.dirty = true;
            chunk.fromX = 5000; // just some large value > world.
            chunk.fromZ = 5000;
            chunk.fromY = 5000;
            chunk.type = CHUNK_FF;
            chunk.blockList = new Array();

            for(var q = 0; q < ff.vals.length; q++) {
                var b = ff.vals[q];
                // we need to reset the values before we set the value in the blockList for the mesh.
                this.blocks[b.x][b.y][b.z] &= ~(1 << 5);
                this.blocks[b.x][b.y][b.z] &= ~(1 << 6);
                b.val = this.blocks[b.x][b.y][b.z]; 
                // Then set it back so that we can use it in RebuildChunk
                this.blocks[b.x][b.y][b.z] |= 0x20;
                chunk.blockList.push(b);

                this.GetChunk(b.x, b.z).dirty = true;
                //this.blocks[b.x][b.y][b.z] = (5 & 0xFF) << 24 | (0 & 0xFF) << 16 | (255 & 0xFF) << 8 | this.blocks[b.x][b.y][b.z] & 0xFF;
                if(b.x < chunk.fromX) {
                    chunk.fromX = b.x;
                }
                if(b.x > chunk.toX) {
                    chunk.toX = b.x;
                }
                if(b.y > chunk.toY) {
                    chunk.toY = b.y;
                }
                if(b.y < chunk.fromY) {
                    chunk.fromY = b.y;
                }
                if(b.z < chunk.fromZ) {
                    chunk.fromZ = b.z;
                }
                if(b.z > chunk.toZ) {
                    chunk.toZ = b.z;
                }
            }
            // Increase area to view all voxels for mesh creation
            chunk.fromX--;
            chunk.fromY--;
            chunk.fromZ--;
            chunk.toX++;
            chunk.toY++;
            chunk.toZ++;
            this.RebuildChunk(chunk);
            game.phys.CreateMeshBlock(chunk);
        }

        for(var m = 0; m < removeBlocks.length; m++) {
            var ff = removeBlocks[m];
            // Remove parts that are very small.
            for(var q = 0; q < ff.vals.length; q++) {
                var b = ff.vals[q];
    //            this.blocks[b.x][b.y][b.z] = 0;
                this.RemoveBlock(b.x,b.y,b.z);
  //              this.blocks[b.x][b.y][b.z] = (5 & 0xFF) << 24 | (255 & 0xFF) << 16 | (2 & 0xFF) << 8 | this.blocks[b.x][b.y][b.z] & 0xFF;
//                this.GetChunk(b.x, b.z).dirty = true;
            }
        }

        // Clears AFTER we have built the chunks where 0x20/0x40 are used.
        for(var i = 0; i < all.length; i++) {
            for(var n = 0; n < all[i].length; n++){
                var b = all[i][n];
                this.blocks[b.x][b.y][b.z] &= ~(1 << 5);
                this.blocks[b.x][b.y][b.z] &= ~(1 << 6);
            }
        }
        this.RebuildDirtyChunks();

    };

    World.prototype.IsBlockHidden = function(x,y,z) {
        if((this.blocks[x][y][z] >> 8) == 0) {
            return true;
        }

        var left = 0, right = 0, above = 0,front = 0, back = 0, below = 0;
        if(y > 0) {
            if((this.blocks[x][y-1][z] >> 8) != 0) {
              below = 1;
            }
        }
        if(z > 0){
            if((this.blocks[x][y][z-1] >> 8) != 0) {
                back = 1;
            }
        }
        if(x > 0) {
            if((this.blocks[x-1][y][z] >> 8) != 0) {
                left = 1;
            }
        }
        if(x < this.worldSize-1) {
            if((this.blocks[x+1][y][z] >> 8) != 0) {
                right = 1;
            }
        }
        if(y < this.chunkHeight-1) {
            if((this.blocks[x][y+1][z] >> 8) != 0) {
                above = 1;   
            }
        }
        if(z < this.worldSize - 1){
            if((this.blocks[x][y][z+1] >> 8) != 0) {
                front = 1;
            }
        }

        if( front == 1 && left == 1 && right == 1 && above == 1 && back == 1 && below == 1) {
            return true;
        }
        return false;
    };

    World.prototype.FloodFill = function(start) {
       // var COLOR1 = lfsr.rand()*255;
       // var COLOR2 = lfsr.rand()*255;
       // var COLOR3 = lfsr.rand()*255;
        var curr = 0x20;
        var stack = new Array();
        var result = new Array();    
        stack.push(start);
        var all = new Array();

        if((start & curr ) != 0) {
            return {"result": true, "vals": result, "all": all};
        }

        while(stack.length != 0) {
            var b = stack.pop();
            all.push(b);
            if(!this.IsWithinWorld(b.x,b.y,b.z)) {
                continue;
            }
            if((this.blocks[b.x][b.y][b.z] >> 8) == 0) {
                continue;
            }

            // If we reach a 0x40 block we know that it leads to ground already.
            // so we can skip searching since we know it leads to ground from here.
            if((this.blocks[b.x][b.y][b.z] & 0x40) != 0) {
                return {"result": true, "vals": result, "all": all};
            }

            if((this.blocks[b.x][b.y][b.z] & curr) != 0) {
               continue;
            }
            if(b.y <= 4) {
                this.blocks[b.x][b.y][b.z] |= curr;
                this.blocks[start.x][start.y][start.z] |= 0x40;
                return {"result": true, "vals": result, "all": all};
            }

            result.push(b);
            //this.blocks[b.x][b.y][b.z] = (COLOR1 & 0xFF) << 24 | (COLOR2 & 0xFF) << 16 | (COLOR3 & 0xFF) << 8 | this.blocks[b.x][b.y][b.z] & 0xFF;
            this.blocks[b.x][b.y][b.z] |= curr;

            stack.push(new THREE.Vector3(b.x, b.y+1, b.z)); 
            stack.push(new THREE.Vector3(b.x, b.y, b.z+1)); 
            stack.push(new THREE.Vector3(b.x+1, b.y, b.z)); 
            stack.push(new THREE.Vector3(b.x, b.y, b.z-1)); 
            stack.push(new THREE.Vector3(b.x-1, b.y, b.z)); 
            stack.push(new THREE.Vector3(b.x, b.y-1, b.z)); 
        }

        this.blocks[start.x][start.y][start.z] |= 0x40;
        return {"result": false, "vals": result, "all": all};
    };

    World.prototype.SmokeBlock = function(x,y,z) {
        var block = game.phys.Get();
        if(block != undefined) {
            // Random colors
            var color = lfsr.rand()*155 | 0;
            var r = color;
            var g = color;
            var b = color;
            block.gravity = -2;
            block.Create(x-this.blockSize*8,
                         y+this.blockSize,
                         z-this.blockSize*8,
                         r,
                         g,
                         b,
                         lfsr.rand()*1, 2, PHYS_SMOKE);

        }
    };

    World.prototype.ExplosionBlock = function(x,y,z) {
        var block = game.phys.Get();
        if(block != undefined) {
            // Random colors
            var r = 255;
            var g = 100+(lfsr.rand()*155 | 0);
            var b = 0;
            block.Create(x-this.blockSize*8,
                         y+this.blockSize,
                         z-this.blockSize*8,
                         r,
                         g,
                         b,
                         lfsr.rand()*4, 0.3);
        }
    };

    World.prototype.RemoveBlock = function(x,y,z) {
        if(x < 0 || y < 0 || z < 0 || x > this.worldSize-1 || y > this.chunkHeight-1 || z > this.worldSize-1) {
            return;
        }
        if(this.blocks[x][y][z] == 0) {
            return;
        }

        var chunk = this.GetChunk(x,z);
        if(chunk != undefined) {
            chunk.blocks--;
            chunk.dirty = true;

            var block = game.phys.Get();
            if(block != undefined) {
            if(lfsr.rand() < 0.25) {
                    var r = (this.blocks[x][y][z] >>  24) & 0xFF;
                    var g = (this.blocks[x][y][z] >> 16 ) & 0xFF;
                    var b = (this.blocks[x][y][z] >> 8 ) & 0xFF;
                    block.Create(x-this.blockSize*8,
                                 y+this.blockSize,
                                 z-this.blockSize*8,
                                 r,
                                 g,
                                 b,
                                 3);
                }
            }
           this.blocks[x][y][z] = 0;
        }
    };

    World.prototype.AddBlock = function(x, y, z, color) {
        var size = 1/this.blockSize;

        if(x < 0 || y < 0 || z < 0 || x > this.worldSize-1 || y > this.chunkHeight-1 || z > this.worldSize-1) {
            return;
        }

        var chunk = this.GetChunk(x,z);
        if(this.blocks[x][y][z] == 0) {
            chunk.blocks += size;
            this.blocks[x][y][z] = (color[0] & 0xFF) << 24 | (color[1] & 0xFF) << 16 | (color[2] & 0xFF) << 8 | 0 & 0xFF;
            chunk.dirty = true;
        }
    };


    World.prototype.SameColor = function(block1, block2) {
        if( ((block1 >> 8) & 0xFFFFFF) == ((block2 >> 8) & 0xFFFFFF) && block1 != 0 && block2 != 0) {
            return true;
        }
        return false;
    };

    // Given world position
    World.prototype.RebuildChunk = function(chunk) {
        var sides = 0;

        var vertices = [];
        var colors = [];
        
        // Block structure
        // BLOCK: [R-color][G-color][B-color][0][00][back_left_right_above_front]
        //           8bit    8bit     8it    1bit(unused)  2bit(floodfill)     5bit(faces)

        // Reset faces
        for(var x = chunk.fromX; x < chunk.toX; x++) {
            for(var y = chunk.fromY; y < chunk.toY; y++) {
                for(var z = chunk.fromZ; z < chunk.toZ; z++) {
                    if(this.blocks[x][y][z] != 0) {
                        // TBD: Hmmm...should work with a AND op? Need some brain to this whine.
                        this.blocks[x][y][z] &= ~(1 << 0)
                        this.blocks[x][y][z] &= ~(1 << 1)
                        this.blocks[x][y][z] &= ~(1 << 2)
                        this.blocks[x][y][z] &= ~(1 << 3)
                        this.blocks[x][y][z] &= ~(1 << 4)
                        //this.blocks[x][y][z] = this.blocks[x][y][z] & 0xFFFFF8;
                    }
                }
            }
        }

        for(var x = chunk.fromX; x < chunk.toX; x++) {
            for(var y = chunk.fromY; y < chunk.toY; y++) {
                for(var z = chunk.fromZ; z < chunk.toZ; z++) {
                    if(chunk.type == CHUNK_FF) {
                        // make sure we only use blocks that we should build as mesh. (floodfill only)
                        if((this.blocks[x][y][z] & 0x20) == 0 && (this.blocks[x][y][z] & 0x40) == 0) {
                            continue;
                        }
                    }
                    if(this.blocks[x][y][z] == 0) {
                        continue; // Skip empty blocks
                    }
                    // Check if hidden
                    var left = 0, right = 0, above = 0,front = 0, back = 0; 
                    if(z > 0){
                        if(this.blocks[x][y][z-1] != 0) {
                            back = 1;
                            this.blocks[x][y][z] = this.blocks[x][y][z] | 0x10;
                        }
                    }
                    if(x > 0) {
                        if(this.blocks[x-1][y][z] != 0) {
                            left = 1;
                            this.blocks[x][y][z] = this.blocks[x][y][z] | 0x8;
                        }
                    }
                    if(x < this.worldSize-1) {
                        if(this.blocks[x+1][y][z] != 0) {
                            right = 1;
                            this.blocks[x][y][z] = this.blocks[x][y][z] | 0x4;
                        }
                    }
                    if(y < chunk.toY-1) {
                        if(this.blocks[x][y+1][z] != 0) {
                            above = 1;   
                            this.blocks[x][y][z] = this.blocks[x][y][z] | 0x2;
                        }
                    }
                    if(z < this.worldSize - 1){
                        if(this.blocks[x][y][z+1] != 0) {
                            front = 1;
                            this.blocks[x][y][z] = this.blocks[x][y][z] | 0x1;
                        }
                    }

                    if( front == 1 && left == 1 && right == 1 && above == 1 && back == 1) {
                        // If we are building a standalone mesh, remove invisible 
                        if(chunk.type == CHUNK_OBJECT || chunk.type == CHUNK_FF) {
                            this.blocks[x][y][z] = 0; 
                        }

                        continue; // block is hidden
                    }
                    // Draw block
                    if(!above) {
                        // Get above (0010)
                        if((this.blocks[x][y][z] & 0x2) == 0) {
                            var maxX = 0;
                            var maxZ = 0;
                            var end = 0;

                            for(var x_ = x; x_ < chunk.toX; x_++) {
                                // Check not drawn + same color
                                if((this.blocks[x_][y][z] & 0x2) == 0 && this.SameColor(this.blocks[x_][y][z], this.blocks[x][y][z])) {
                                    maxX++;
                                } else {
                                    break;
                                }
                                var tmpZ = 0;
                                for(var z_ = z; z_ < chunk.toZ; z_++) {
                                    if((this.blocks[x_][y][z_] & 0x2) == 0 && this.SameColor(this.blocks[x_][y][z_], this.blocks[x][y][z])) {
                                        tmpZ++;
                                    } else {
                                        break;
                                    }
                                }
                                if(tmpZ < maxZ || maxZ == 0) {
                                    maxZ = tmpZ;
                                }
                            }
                            for(var x_ = x; x_ < x+maxX; x_++) {
                                for(var z_ = z; z_ < z+maxZ; z_++) {
                                  this.blocks[x_][y][z_] = this.blocks[x_][y][z_] | 0x2;
                                }
                            }
                            maxX--;
                            maxZ--;

                            vertices.push([x*this.blockSize + (this.blockSize*maxX), y*this.blockSize, z*this.blockSize+(this.blockSize*maxZ)]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize, z*this.blockSize+(this.blockSize*maxZ)]);

                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize, z*this.blockSize+(this.blockSize*maxZ)]);
                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize, z*this.blockSize-this.blockSize]);

                            sides += 6;
                            for(var n = 0; n < 6; n++) {
                                colors.push([((this.blocks[x][y][z] >> 24) & 0xFF),
                                            ((this.blocks[x][y][z] >> 16) & 0xFF), 
                                            ((this.blocks[x][y][z] >> 8) & 0xFF)
                                ]);
                            }
                        }
                    }
                    if(!back) { 
                        // back  10000
                        if((this.blocks[x][y][z] & 0x10) == 0) {
                            var maxX = 0;
                            var maxY = 0;

                            for(var x_ = x; x_ < chunk.toX; x_++) {
                                // Check not drawn + same color
                                if((this.blocks[x_][y][z] & 0x10) == 0 && this.SameColor(this.blocks[x_][y][z], this.blocks[x][y][z])) {
                                    maxX++;
                                } else {
                                    break;
                                }
                                var tmpY = 0;
                                for(var y_ = y; y_ < chunk.toY; y_++) {
                                    if((this.blocks[x_][y_][z] & 0x10) == 0 && this.SameColor(this.blocks[x_][y_][z], this.blocks[x][y][z])) {
                                        tmpY++;
                                    } else {
                                        break;
                                    }
                                }
                                if(tmpY < maxY || maxY == 0) {
                                    maxY = tmpY;
                                }
                            }
                            for(var x_ = x; x_ < x+maxX; x_++) {
                                for(var y_ = y; y_ < y+maxY; y_++) {
                                    this.blocks[x_][y_][z] = this.blocks[x_][y_][z] | 0x10;
                                }
                            }
                            maxX--;
                            maxY--;
                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize+(this.blockSize*maxY), z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize-this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize-this.blockSize]);
                            
                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize+(this.blockSize*maxY), z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize-this.blockSize]);

                            sides += 6;
                            for(var n = 0; n < 6; n++) {
                                colors.push([((this.blocks[x][y][z] >> 24) & 0xFF),
                                            ((this.blocks[x][y][z] >> 16) & 0xFF), 
                                            ((this.blocks[x][y][z] >> 8) & 0xFF)
                                ]);
                            }
                        }
                    }
                    if(!front) { 
                        // front 0001
                        if((this.blocks[x][y][z] & 0x1) == 0) {
                            var maxX = 0;
                            var maxY = 0;

                            for(var x_ = x; x_ < chunk.toX; x_++) {
                                // Check not drawn + same color
                                if((this.blocks[x_][y][z] & 0x1) == 0 && this.SameColor(this.blocks[x_][y][z], this.blocks[x][y][z])) {
                                    maxX++;
                                } else {
                                    break;
                                }
                                var tmpY = 0;
                                for(var y_ = y; y_ < chunk.toY; y_++) {
                                    if((this.blocks[x_][y_][z] & 0x1) == 0 && this.SameColor(this.blocks[x_][y_][z], this.blocks[x][y][z])) {
                                        tmpY++;
                                    } else {
                                        break;
                                    }
                                }
                                if(tmpY < maxY || maxY == 0) {
                                    maxY = tmpY;
                                }
                            }
                            for(var x_ = x; x_ < x+maxX; x_++) {
                                for(var y_ = y; y_ < y+maxY; y_++) {
                                    this.blocks[x_][y_][z] = this.blocks[x_][y_][z] | 0x1;
                                }
                            }
                            maxX--;
                            maxY--;

                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize+(this.blockSize*maxY), z*this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize]);
                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize-this.blockSize, z*this.blockSize]);

                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize]);
                            vertices.push([x*this.blockSize+(this.blockSize*maxX), y*this.blockSize-this.blockSize, z*this.blockSize]);
                            sides += 6;
                            for(var n = 0; n < 6; n++) {
                                colors.push([((this.blocks[x][y][z] >> 24) & 0xFF),
                                            ((this.blocks[x][y][z] >> 16) & 0xFF), 
                                            ((this.blocks[x][y][z] >> 8) & 0xFF)
                                ]);
                            }
                        }
                    }
                    if(!left) {
                        if((this.blocks[x][y][z] & 0x8) == 0) {
                            var maxZ = 0;
                            var maxY = 0;

                            for(var z_ = z; z_ < chunk.toZ; z_++) {
                                // Check not drawn + same color
                                if((this.blocks[x][y][z_] & 0x8) == 0 && this.SameColor(this.blocks[x][y][z_], this.blocks[x][y][z])) {
                                    maxZ++;
                                } else {
                                    break;
                                }
                                var tmpY = 0;
                                for(var y_ = y; y_ < chunk.toY; y_++) {
                                    if((this.blocks[x][y_][z_] & 0x8) == 0 && this.SameColor(this.blocks[x][y_][z_], this.blocks[x][y][z])) {
                                        tmpY++;
                                    } else {
                                        break;
                                    }
                                }
                                if(tmpY < maxY || maxY == 0) {
                                    maxY = tmpY;
                                }
                            }
                            for(var z_ = z; z_ < z+maxZ; z_++) {
                                for(var y_ = y; y_ < y+maxY; y_++) {
                                    this.blocks[x][y_][z_] = this.blocks[x][y_][z_] | 0x8;
                                }
                            }
                            maxZ--;
                            maxY--;

                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize+(this.blockSize*maxZ)]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize+(this.blockSize*maxZ)]);

                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize+(this.blockSize*maxZ)]);
                            vertices.push([x*this.blockSize-this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize-this.blockSize]);

                            sides += 6;
                            for(var n = 0; n < 6; n++) {
                                colors.push([((this.blocks[x][y][z] >> 24) & 0xFF),
                                            ((this.blocks[x][y][z] >> 16) & 0xFF), 
                                            ((this.blocks[x][y][z] >> 8) & 0xFF)
                                ]);
                            }
                        }
                    }
                    if(!right) {
                        if((this.blocks[x][y][z] & 0x4) == 0) {
                            var maxZ = 0;
                            var maxY = 0;

                            for(var z_ = z; z_ < chunk.toZ; z_++) {
                                // Check not drawn + same color
                                if((this.blocks[x][y][z_] & 0x4) == 0 && this.SameColor(this.blocks[x][y][z_], this.blocks[x][y][z])) {
                                    maxZ++;
                                } else {
                                    break;
                                }
                                var tmpY = 0;
                                for(var y_ = y; y_ < chunk.toY; y_++) {
                                    if((this.blocks[x][y_][z_] & 0x4) == 0 && this.SameColor(this.blocks[x][y_][z_], this.blocks[x][y][z])) {
                                        tmpY++;
                                    } else {
                                        break;
                                    }
                                }
                                if(tmpY < maxY || maxY == 0) {
                                    maxY = tmpY;
                                }
                            }
                            for(var z_ = z; z_ < z+maxZ; z_++) {
                                for(var y_ = y; y_ < y+maxY; y_++) {
                                    this.blocks[x][y_][z_] = this.blocks[x][y_][z_] | 0x4;
                                }
                            }
                            maxZ--;
                            maxY--;
                            
                            vertices.push([x*this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize+(this.blockSize*maxZ)]);
                            vertices.push([x*this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize+(this.blockSize*maxZ)]);

                            vertices.push([x*this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize+(this.blockSize*maxZ)]);
                            vertices.push([x*this.blockSize, y*this.blockSize-this.blockSize, z*this.blockSize-this.blockSize]);
                            vertices.push([x*this.blockSize, y*this.blockSize+(this.blockSize*maxY), z*this.blockSize-this.blockSize]);
                            
                            sides += 6;
                            for(var n = 0; n < 6; n++) {
                                colors.push([((this.blocks[x][y][z] >> 24) & 0xFF),
                                            ((this.blocks[x][y][z] >> 16) & 0xFF), 
                                            ((this.blocks[x][y][z] >> 8) & 0xFF)
                                ]);
                            }
                        }
                    } 

                    if(chunk.type == CHUNK_OBJECT || chunk.type == CHUNK_FF ) { 
                        this.blocks[x][y][z] = 0; 
                    }
                }
            }
        }
        chunk.triangles = vertices.length/3;

        // Draw chunk
        var geometry = new THREE.BufferGeometry();
        var v = new THREE.BufferAttribute( new Float32Array( vertices.length * 3), 3 );
        for ( var i = 0; i < vertices.length; i++ ) {
            v.setXYZ(i, vertices[i][0], vertices[i][1], vertices[i][2]);
        }
        geometry.addAttribute( 'position', v );

        var c = new THREE.BufferAttribute(new Float32Array( colors.length * 3), 3 );
        for ( var i = 0; i < colors.length; i++ ) {
            c.setXYZW( i, colors[i][0]/255, colors[i][1]/255, colors[i][2]/255, 1);
        }
        geometry.addAttribute( 'color', c );

        geometry.computeVertexNormals();
        geometry.computeFaceNormals();

        geometry.computeBoundingBox();

        game.scene.remove(chunk.mesh);
        chunk.mesh = new THREE.Mesh( geometry, this.material);

        chunk.mesh.position.set(
            (chunk.fromX/this.chunkBase)-this.chunkBase/2 - this.blockSize*(chunk.fromX/this.chunkBase), 
            this.blockSize,
            (chunk.fromZ/this.chunkBase)-this.chunkBase/2 - this.blockSize*(chunk.fromZ/this.chunkBase)
        );

        chunk.mesh.receiveShadow = true;
        chunk.mesh.castShadow = true;
        chunk.dirty = false;
        game.scene.add( chunk.mesh );
        chunk.mesh.visible = true;
    };
}



