function Proc() {
    this.worldSize = 0;
    this.worldSpace = 0;
    this.landHeight = 4;

    this.currentType = 0;

    this.addBuffer = [];
    this.lastBuffer = [];
    this.freeDraw = [];

    Proc.prototype.DrawType = function(x, y, z) {
        switch(this.currentType) {
            case 2: // block 
             this.Block(x, y, z, 0);
             break;
            case 3: // Remove
             this.Block(x, y, z, 1);
             break;
            case 4: // Free Draw
             this.FreeDrawBlock();
             break;
            case 5: // Explode
                game.world.Explode(x,y,z, 10, false);
             break;
            case 6: // Explode w/o haning blocks
                game.world.Explode(x,y,z, 10, true);
             break;
        }
        //game.world.RebuildDirtyChunks();
    };

    Proc.prototype.FreeDrawock = function() {
       var from = this.freeaw.pop();
       var to = this.freeDr.pop();
       var height = $('#heit').text();
       var color = $('#colo').text();

       var fx,tx,fz,tz;
       if(from.x < to.x) {
           fx = to.x;
           tx = from.x;
       } else {
           fx = from.x;
           tx = to.x;
       }
       if(from.z < to.z) {
           fz = to.z;
           tz = from.z;
       } else {
           fz = from.z;
           tz = to.z;
       }

       for(var x = tx; x < fx; x++) {
           for(var z = tz; z < fz; z++) {
               for(var y = 0; y < height; y++) {
                    this.Add(x, y, z, color);
                    this.lastBuffer.push(new THREE.Vector3(x,y,z));
               }
           }
       }
    };

    Proc.prototype.Add = function(x,y,z,color) {
        game.world.AddBlock(x,y,z, color);
        this.addBuffer.push(new THREE.Vector3(x,y,z));
    };

    Proc.prototype.UndoLast = function() {
        var blockPos;
        while((blockPos = this.lastBuffer.pop()) != undefined) {
            game.world.RemoveBlock(blockPos.x, blockPos.y, blockPos.z);
            this.addBuffer.pop();
        }
        game.world.RebuildDirtyChunks();
    };

    Proc.prototype.Undo = function() {
        var blockPos = this.addBuffer.pop();
        if(blockPos != undefined) {
            game.world.RemoveBlock(blockPos.x, blockPos.y, blockPos.z);
            this.lastBuffer.pop();
            game.world.RebuildDirtyChunks();
        }
    };

    Proc.prototype.Remove = function(x, y, z) {
        // TBD: Clean up undo buffers
        game.world.RemoveBlock(x, y, z);
    };

    Proc.prototype.Block = function(posX, posY, posZ, type) {
        var width = $('#width').text();
        var height = $('#height').text();
        var color = $('#color2').text();
        
        this.lastBuffer = [];

        if(width == 1) {
            for(var y = 0; y < height; y++) {
                if(type == 0) {
                    this.Add(posX, posY+y, posZ, color);
                    this.lastBuffer.push(new THREE.Vector3(posX, posY+y, posZ));
                } else {
                    this.Remove(posX, posY+y, posZ);
                }
            }
        } else {
            for(var x = posX-width/2; x < posX+width/2; x++) {
                for(var z = posZ-width/2; z < posZ+width/2; z++) {
                    for(var y = 0; y < height; y++) {
                        if(type == 0) {
                            this.Add(x, posY+y, z, color);
                            this.lastBuffer.push(new THREE.Vector3(x, posY+y, z));
                        } else {
                            this.Remove(x, posY+y, z);
                        }
                    }
                }
            }
        }
    };

    Proc.prototype.Mushroom = function() {
        var pos = this.GetRandomPoint();
        var stemHeight = this.landHeight;
        var base = stemHeight+8;
        for (var z = 0; z < base; z++) {
            for (var y = base-1; y > base/2; y--) {
                for (var x = 0; x < base; x++){
                    if (Math.sqrt( (x-base/2)*(x-base/2) + (y-base/2)*(y-base/2) + (z-base/2)*(z-base/2)) <= base/2)
                        {
                            game.world.AddBlock(pos.x+x, y, pos.z+z, Math.random()>0.9? 8: 10);
                        }
                }
            }
        }
        var stemMin = 2;
        var stemMax = 6;
        for(var y = 0; y < stemHeight; y++) {
            if(stemMax > stemMin) {
                stemMax--;
            }
            for(var x = 0; x < stemMax; x++) {
                for(var z = 0; z < stemMax; z++) {
                    game.world.AddBlock(pos.x+x+(base/stemMax), stemHeight+y, pos.z+z+(base/stemMax), 8);
                }
            }
        }
    };



    Proc.prototype.GetRandomPoint = function() {
        return new THREE.Vector3(Math.round(Math.random()*game.world.worldSize),0,
                                 Math.round(Math.random()*game.world.worldSize));
    };

    Proc.prototype.Init = function(worldSize) {
        this.worldSize = worldSize;

        this.worldSpace = new Array(worldSize);
        for(var x = 0; x < this.worldSpace.length; x++) {
            this.worldSpace[x] = new Array(worldSize);
            for(var z = 0; z < this.worldSpace[x].length; z++) {
                this.worldSpace[x][z] = 0;
            }
        }
    };

    Proc.prototype.CheckFreeSpace = function(x_,z_,size) {
        for(var x = x_ - size/2; x < x_+size/2; x++) {
            for(var z = z_ - size/2; z < z_+size/2; z++) {
                if(this.worldSpace[x][z] != 0) {
                    return 0;
                }
            }
            if(fail) {
                return 0;
            }
        }
        return 1;
    };

    Proc.prototype.Tree = function() {
        var height = Math.round(Math.random()*game.world.chunkHeight);
        var width = 3+Math.round(Math.random()*10);
        var pos = this.GetRandomPoint();

        for(var y = this.landHeight; y < this.landHeight+height; y++) {
            if(width > 3) { 
                width--;
            }
            for(var x = 0; x < width; x++) {
                for(var z = 0; z < width; z++) {
                    var offset = Math.round(Math.sin(y));
                    game.world.AddBlock(pos.x+x+offset, y, pos.z+z+offset, 7);
                }
            }
        }


        //DrawSphere(_x, top, _z, 40, 12, 40, 26571);
    };

   // Proc.prototype.Block = function(size, height) {
   //     var pos = this.GetRandomPoint();
   //     for(var x = 0; x < size; x++) {
   //         for(var z = 0; z < size; z++) {
   //             for(var y = this.landHeight; y < this.landHeight+height; y++) {
   //                 game.world.AddBlock(pos.x+x, y, pos.z+z, 5);
   //             }
   //         }
   //     }
   // };

    Proc.prototype.GetRand = function(min,max) {
        return Math.round(min+Math.random()*(max-min));
    };

    Proc.prototype.Rock = function() {
        var pos = this.GetRandomPoint();
        var w1 = this.GetRand(10,40);
        var w2 = this.GetRand(10,40);
        var h = this.GetRand(this.landHeight+5, game.world.chunkHeight);
        var drawMax = 0;
        var low1 = this.GetRand(1,w1/this.GetRand(3,6));
        var low2 = this.GetRand(1,w2/this.GetRand(3,6));
        
        var debRange = 5;
        for(var x = -debRange; x < w1+debRange; x++) {
            for(var z = -debRange; z < w2+debRange; z++) {
                if(Math.random()>0.9) {
                    game.world.AddBlock(pos.x+x, this.landHeight, pos.z+z, Math.random()>0.5? 0: 1);
                }
            }
        }

        for(var x = 0; x < w1; x++) {
            for(var z = 0; z < w2; z++) {
                drawMax = 0;
                if((x < low1 || z < low2 || x > w1 - low1 || z > w2 - low2)) {
                    drawMax = this.GetRand(2,h);
                    
                } else {
                    drawMax = h;
                }
                
                for(var y = this.landHeight; y < drawMax; y++) {
                    if(y > drawMax-2) {
                        Math.random()>0.9? false: game.world.AddBlock(pos.x+x, y, pos.z+z, Math.random()>0.9? 2: 3);
                    } else if(y < this.landHeight+4) {
                        Math.random()<0.5? game.world.AddBlock(pos.x+x, y, pos.z+z, Math.random()>0.9? 11: 12): 
                                           game.world.AddBlock(pos.x+x, y, pos.z+z, Math.random()>0.9? 0: 1);
                    } else {
                        Math.random()>0.1? game.world.AddBlock(pos.x+x, y, pos.z+z, Math.random()>0.9? 11: 12): false;
                        if(Math.random()>0.95) {
                            game.world.AddBlock(pos.x+x, y+2, pos.z+z, Math.random()>0.9? 2: 11);
                        }
                    }
                }
            }
        }
    };


    Proc.prototype.Flower3 = function() {
        var pos = this.GetRandomPoint();
        var maxZ = 1+Math.round(Math.random()*2);
        var zCurrent = 0;
        for(var x = 0; x < maxZ+2; x++) {
            for(var z = 0; z < zCurrent; z++) {
                game.world.AddBlock(pos.x+x, this.landHeight+1, pos.z+z, 5);
                game.world.AddBlock(pos.x+x, this.landHeight+1, pos.z-z, 5);
                game.world.AddBlock(pos.x+(maxZ+1)*2-x, this.landHeight+1, pos.z-z, 5);
                game.world.AddBlock(pos.x+(maxZ+1)*2-x, this.landHeight+1, pos.z+z, 5);
            }
            zCurrent++;
        }
        var y = this.landHeight;
        var height = y+6+Math.round(Math.random()*4);
        for(var h = y; h < height; h++) {
            // stem
            game.world.AddBlock(pos.x+maxZ+1, h, pos.z, 5);
            // Pistil
            if(h%2) {
                if(Math.random()>0.5) {
                    game.world.AddBlock(pos.x+maxZ+1, h, pos.z+1, 6);
                    game.world.AddBlock(pos.x+maxZ+2, h, pos.z, 10);
                } else {
                    game.world.AddBlock(pos.x+maxZ+1, h, pos.z-1, 6);
                    game.world.AddBlock(pos.x+maxZ, h, pos.z, 10);
                }
            }
        }
        game.world.AddBlock(pos.x+maxZ+1, height, pos.z, Math.random()>0.5? 10: 6);
    };

    Proc.prototype.Flower2 = function() {
        var pos = this.GetRandomPoint();
        var maxZ = 1+Math.round(Math.random()*2);
        var zCurrent = 0;
        for(var x = 0; x < maxZ+2; x++) {
            for(var z = 0; z < zCurrent; z++) {
                game.world.AddBlock(pos.x+x, this.landHeight, pos.z+z, 5);
                game.world.AddBlock(pos.x+x, this.landHeight, pos.z-z, 5);
                game.world.AddBlock(pos.x+(maxZ+1)*2-x, this.landHeight, pos.z-z, 5);
                game.world.AddBlock(pos.x+(maxZ+1)*2-x, this.landHeight, pos.z+z, 5);
            }
            zCurrent++;
        }
        // Stem
        var y = this.landHeight;
        var height = y+1+Math.round(Math.random()*4);
        for(var h = y+1; h < height; h++) {
            game.world.AddBlock(pos.x+maxZ+1, h, pos.z, 5);
        }
        // Pistil
        game.world.AddBlock(pos.x+maxZ+1, height, pos.z+1, 8);
        game.world.AddBlock(pos.x+maxZ+1, height, pos.z-1, 8);
        game.world.AddBlock(pos.x+maxZ+2, height, pos.z, 8);
        game.world.AddBlock(pos.x+maxZ, height, pos.z, 8);

        game.world.AddBlock(pos.x+maxZ+1, height, pos.z, Math.random()>0.5? 6: 9);
    };

    Proc.prototype.Flower1 = function() {
        var height = this.GetRand(2,4);
        var pos = this.GetRandomPoint();
        for(var y = this.landHeight; y < this.landHeight+height; y++) {
            game.world.AddBlock(pos.x, y, pos.z, 4);
        }
        game.world.AddBlock(pos.x, y, pos.z, 6);
    };

    Proc.prototype.Grass = function() {
        var pos = this.GetRandomPoint();
        var maxY = 2+Math.round(Math.random()*2);
        var yCurrent = 0;
        for(var x = 0; x < maxY+2; x++) {
            for(var y = 0; y < yCurrent; y++) {
                game.world.AddBlock(pos.x+x, this.landHeight+y, pos.z, 5);
                game.world.AddBlock(pos.x+(maxY+1)*2-x, this.landHeight+y, pos.z, 5);
            }
            yCurrent++;
        }
    };

    Proc.prototype.Land = function(size) {
        var color = 0;
        for(var y = 0; y < this.landHeight; y++) { 
            for(var x = 0; x < size; x++) {
                for(var z = 0; z < size; z++) {
                    var pattern = Math.random()*10 > 9? true: false;
                    if(y == this.landHeight-1) {
                        if(pattern) {
                            color = 2;
                        } else {
                            color = 3;
                        }
                    } else {
                        color = 0;
                    }
                    game.world.AddBlock(x,y,z, color);
                }
            }
        }
    };
};
