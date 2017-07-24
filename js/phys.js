//==============================================================================
// Author: Nergal
// Date: 2015-11-17
//==============================================================================
// TBD: enum
const PHYS_REGULAR = 0;
const PHYS_SMOKE = 1;
const PHYS_MISSILE = 2;
const PHYS_SNOW = 3;
const PHYS_GRENADE = 4;
const PHYS_DIE = 5;
const PHYS_SHOT = 6;

function MeshBlock() {
    this.mesh = undefined;
    this.helper = undefined;
    this.gravity = 19.82;
    this.mass = 1;
    this.airDensity = 1.2;
    this.e = -0.2;
    this.area = 0.1;
    this.active = 1;
    this.chunk = undefined;

    this.bounces_orig = 2;
    this.bounces = this.bounces_orig;
    this.avg_ay = -2;
    this.vy = 0;
    this.remove = 0;

    MeshBlock.prototype.Draw = function(time, delta) {
        this.mesh.updateMatrixWorld();
        for (var i = 0; i < this.chunk.blockList.length; i+=this.off) {
            var b = this.chunk.blockList[i];
            var vector = new THREE.Vector3(b.x,b.y,b.z);
            vector.applyMatrix4( this.mesh.matrixWorld );
            var xi = vector.x + game.world.blockSize*8 | 0;
            var yi = vector.y | 0;
            var zi = vector.z + game.world.blockSize*8 | 0;

            if(game.world.IsWithinWorld(xi,yi,zi)) {
                if((game.world.blocks[xi][yi][zi] >> 8) != 0) {
                    game.world.PlaceObject(xi,yi,zi, this.chunk);
                    this.active = 0;
                    this.remove = 1;
                    return;
                }
            }
            if(yi <= 0) {
                game.world.PlaceObject(xi,0,zi, this.chunk);
                this.remove = 1;
                this.active = 0;
                return;
            }   
        }
        
        var fy = this.mass*this.gravity;
        fy += -1 * 0.5 * this.airDensity * this.area * this.vy * this.vy;
        var dy = this.vy * delta + (0.5 * this.avg_ay * delta * delta);

        this.mesh.position.y += dy * 10;
        var new_ay = fy / this.mass;
        this.avg_ay = 0.5 * (new_ay + this.avg_ay);
        this.vy -= this.avg_ay * delta;
    };

    MeshBlock.prototype.Create = function(chunk) {
        this.mesh = chunk.mesh;
        this.mesh.chunk = chunk;
        this.chunk = chunk;
        this.active = 1;
        this.off = 1;
        if(this.chunk.blockList.length > 100) {
            this.off = this.chunk.blockList.length/500 | 0;
            if(this.off < 1) {
                this.off = 1;
            }
        }
       //for(var i = 0; i < chunk.blockList.length; i+=this.off) {
       //    var b = chunk.blockList[i];
       //    var m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color: 0xFF00FF, wireframe: true}));
       //    m.position.set(b.x, b.y, b.z);
       //    //m.visible = false;
       //    this.mesh.add(m);
       //}
    };
}


function PhysBlock(){
   this.life = 0;
   this.mesh = undefined;
   this.color = '0xFFFFFF';
   this.active = 0;
   this.gravity = 9.82;
   this.e = -0.3; // restitution
   this.mass = 0.1; // kg
   this.airDensity = 1.2;
   this.drag = -5.95;
   this.area = 1/1000;
   this.vy = 0;
   this.avg_ay = 0;

   this.vx = 0;
   this.vz = 0;
   this.avg_ax = 0;
   this.avg_az = 0;

   this.bounces = 0;
   this.bounces_orig = 0;
   this.fx_ = 0;
   this.fz_ = 0;
   this.type = PHYS_REGULAR;
   this.ray = undefined;


   PhysBlock.prototype.Init = function() {
        var geo = new THREE.BoxGeometry(
            game.world.blockSize,
            game.world.blockSize,
            game.world.blockSize);

        var mat = new THREE.MeshLambertMaterial();
        this.mesh = new THREE.Mesh(geo, mat);
        game.scene.add(this.mesh);
        this.mesh.visible = false;
        this.mesh.castShadow = true;
        this.bounces_orig = (1+lfsr.rand()+2) | 0;
        //this.fx_ = lfsr.rand()-0.5;
        //this.fz_ = lfsr.rand()-0.5;

        this.fx_ = Math.random()-0.5;
        this.fz_ = Math.random()-0.5;
   };

   PhysBlock.prototype.Create = function(x,y,z,r, g, b, power, life, type, bounces, mass) {
       this.type = type? type: PHYS_REGULAR;
       if(this.type != PHYS_MISSILE && this.type != PHYS_SNOW && this.type != PHYS_GRENADE && this.type != PHYS_SHOT) {
           this.life = life? lfsr.rand()*life: lfsr.rand()*3;
       } else {
           this.life = life;
       }
       this.mass = mass? mass: 0.1; // TBD: orig
       this.bounces = bounces? bounces: this.bounces_orig;
       this.avg_ay = 0;
       this.avg_ax = 0;
       this.avg_az = 0;

       if(this.type == PHYS_MISSILE || this.type == PHYS_GRENADE || this.type == PHYS_SHOT) {
           // Extract direction vector
           var pos = new THREE.Vector3(0,2,50);
           var gpos = pos.applyMatrix4(game.player.mesh.matrix);
           var dir = pos.sub(game.player.mesh.position);
           this.ray = new THREE.Raycaster(gpos, dir.clone().normalize());
           this.vx = power+this.ray.ray.direction.x;
           this.vy = power;
           this.vz = power+this.ray.ray.direction.z;
       } else {
           this.vx = power;
           this.vy = power;
           this.vz = power;
       }

       var col = game.world.rgbToHex(r, g,b);
       this.mesh.material.color.setHex(col);
       this.mesh.material.needsUpdate = true;
       this.mesh.position.set(x,y,z);
       this.mesh.visible = true;
       this.mesh.scale.set(1,1,1);
   };

   PhysBlock.prototype.Draw = function(time, delta) {
       this.life -= delta;
       if(this.life <= 0 || this.bounces == 0 || this.mesh.position.y < -5) {
           if(this.type == PHYS_MISSILE) {
                var x = this.mesh.position.x+game.world.blockSize*8 | 0;
                var y = this.mesh.position.y | 0;
                var z = this.mesh.position.z+game.world.blockSize*8 | 0;
                //if(game.world.IsWithinWorld(x,y,z)) {
                    game.world.Explode(x, y, z, 8, 0);
                //}
           } else if(this.type == PHYS_GRENADE) {
                var x = this.mesh.position.x+game.world.blockSize*8 | 0;
                var y = this.mesh.position.y | 0;
                var z = this.mesh.position.z+game.world.blockSize*8 | 0;
                if(game.world.IsWithinWorld(x,y,z)) {
                    game.world.Explode(x, y, z, 15, 0); 
                }
           } else if(this.type == PHYS_SHOT) {
                var x = this.mesh.position.x+game.world.blockSize*8 | 0;
                var y = this.mesh.position.y | 0;
                var z = this.mesh.position.z+game.world.blockSize*8 | 0;
                if(game.world.IsWithinWorld(x,y,z)) {
                    game.world.Explode(x, y, z, 2, 0); 
                }
           } else if(this.type == PHYS_SNOW) {
               var x = this.mesh.position.x+game.world.blockSize*8 | 0;
               var y = this.mesh.position.y-3 | 0;
               var z = this.mesh.position.z+game.world.blockSize*8 | 0;
               if(game.world.IsWithinWorld(x,y,z)) {
                   game.world.blocks[x][y][z] = 255 << 24 | 255 << 16 | 255 << 8;
                   game.world.GetChunk(x, z).dirty = true;
                   game.world.RebuildDirtyChunks();
               }
           }
           this.mesh.visible = false;
           this.active = 0;
           this.life = 0;
           return;
       }
       
       var x = this.mesh.position.x+game.world.blockSize*8 | 0;
       var y = this.mesh.position.y | 0;
       var z = this.mesh.position.z+game.world.blockSize*8 | 0;

       var fy = this.mass*this.gravity;
       var fx, fz;
       if(this.type == PHYS_MISSILE) { 
           fx = this.mass*this.gravity; //*this.ray.ray.direction.x;
           fz = this.mass*this.gravity; //*this.ray.ray.direction.z;
       } else {
           fx = this.mass*this.gravity * lfsr.rand()-0.5;
           fz = this.mass*this.gravity * lfsr.rand()-0.5;
       }
           
       fy += -1 * 0.5 * this.airDensity * this.area * this.vy * this.vy;
       fx += -1 * 0.5 * this.airDensity * this.area * this.vx * this.vx;
       fz += -1 * 0.5 * this.airDensity * this.area * this.vz * this.vz;

       var dy = this.vy * delta + (0.5 * this.avg_ay * delta * delta);
       var dx = this.vx * delta + (0.5 * this.avg_ax * delta * delta);
       var dz = this.vz * delta + (0.5 * this.avg_az * delta * delta);

       if(this.type == PHYS_REGULAR || this.type == PHYS_DIE) {
           this.mesh.position.x += dx * 10*this.fx_;
           this.mesh.position.z += dz * 10*this.fz_;
           this.mesh.position.y += dy * 10;
       } else if(this.type == PHYS_SMOKE) {
           this.mesh.position.y += dy * 10;
           this.mesh.position.x += Math.sin(dx)*this.fx_;
           this.mesh.position.z += Math.sin(dz)*this.fz_;
       } else if(this.type == PHYS_SNOW) {
           this.mesh.position.y += dy * 10;
           this.mesh.position.x += Math.sin(dx)*this.fx_;
           this.mesh.position.z += Math.sin(dz)*this.fz_;
       } else if(this.type == PHYS_SHOT) {
           this.mesh.position.x += dx * 10*this.ray.ray.direction.x;
           this.mesh.position.z += dz * 10*this.ray.ray.direction.z;
       } else if(this.type == PHYS_MISSILE) {
           this.mesh.position.x += dx * 10*this.ray.ray.direction.x;
           this.mesh.position.z += dz * 10*this.ray.ray.direction.z;
           var smoke = game.phys.Get();
           if(smoke != undefined) {
               // Random colors
               smoke.gravity = -2;
               smoke.Create(this.mesh.position.x,
                            this.mesh.position.y,
                            this.mesh.position.z,
                            230,
                            230,
                            230,
                            lfsr.rand()*1, 1, PHYS_SMOKE);

           }
       } else if(this.type == PHYS_GRENADE) {
           this.mesh.position.x += dx * 10*this.ray.ray.direction.x;
           this.mesh.position.z += dz * 10*this.ray.ray.direction.z;
           this.mesh.position.y += dy * 20;
           if(lfsr.rand()>0.7) {
               var smoke = game.phys.Get();
               if(smoke != undefined) {
                   // Random colors
                   smoke.gravity = -2;
                   var r = 200;
                   var g = (100+lfsr.rand()*155) | 0;
                   var b = 0;
                   smoke.Create(this.mesh.position.x,
                                this.mesh.position.y,
                                this.mesh.position.z,
                                r,
                                g,
                                b,
                                lfsr.rand()*1, 0.5, PHYS_SMOKE);

               }
           }
       }
       

       var new_ay = fy / this.mass;
       this.avg_ay = 0.5 * (new_ay + this.avg_ay);
       this.vy -= this.avg_ay * delta;

       var new_ax = fx / this.mass;
       this.avg_ax = 0.5 * (new_ax + this.avg_ax);
       this.vx -= this.avg_ax * delta;

       var new_az = fz / this.mass;
       this.avg_az = 0.5 * (new_az + this.avg_az);
       this.vz -= this.avg_az * delta;
       
       this.mesh.rotation.set(this.vx, this.vy, this.vz);

       if(this.type == PHYS_MISSILE || this.type == PHYS_SHOT) {
            if(game.world.IsWithinWorld(x,y,z)) {
                for(var x1 = -1; x1 < 2; x1++) {
                    for(var z1 = -1; z1 < 2; z1++) {
                        if(game.world.IsWithinWorld(x+x1,y,z+z1)) {
                            if((game.world.blocks[x+x1][y][z+z1] >> 8) != 0) {
                                this.life = 0;
                                return;
                            }
                        }
                    }
                }
            }
       } else if(this.type == PHYS_GRENADE) {
           var x = this.mesh.position.x | 0;
           var y = this.mesh.position.y | 0;
           var z = this.mesh.position.z | 0;
            if(game.world.IsWithinWorld(x,y,z)) {
                for(var x1 = 0; x1 < 2; x1++) {
                    for(var z1 = 0; z1 < 2; z1++) {
                        for(var y1 = 0; y1 < 2; y1++) {
                            if(game.world.IsWithinWorld(x+x1,y+y1,z+z1)) {
                                if(this.mesh.position.y <= 0 && this.vy < 0 ) {
                                    this.bounces--;
                                    this.vy *= this.e*1.5;
                                    return;
                                }
                                if((game.world.blocks[x+x1][y+y1][z+z1] >> 8) != 0) {
                                    if(this.vy < 0 ) {
                                        this.bounces--;
                                        this.vy *= this.e*1.5;
                                    }
                                    if(this.vx < 0 ) {
                                        this.bounces--;
                                        this.vx *= this.e*2;
                                        this.ray.ray.direction.x *= -1;
                                    } else {
                                        this.bounces--;
                                        this.ray.ray.direction.x *= -1;
                                        this.vx *= -this.e*2;
                                    }

                                    if(this.vz < 0 ) {
                                        this.bounces--;
                                        this.vz *= this.e*2;
                                        this.ray.ray.direction.z *= -1;
                                    } else {
                                        this.bounces--;
                                        this.ray.ray.direction.z *= -1;
                                        this.vz *= -this.e*2;
                                    }

                                }
                            }
                        }
                    }
                }
            }
       } else if(this.type == PHYS_DIE) {
           if(game.world.IsWithinWorld(x,y,z)) {
               if((game.world.blocks[x][y][z] >> 8) != 0 && this.vy < 0) {
                   this.mesh.position.y+=game.world.blockSize*4; 
                   this.mesh.rotation.set(0,0,0);
                   this.vy *= this.e; 
                   this.bounces--;
               }
           }

       } else {
           if(game.world.IsWithinWorld(x,y,z)) {
               if((game.world.blocks[x][y][z] >> 8) != 0 && game.world.IsBlockHidden(x,y,z)) {
                   this.mesh.visible = false;
                   this.active = 0;
                   this.life = 0;
                   this.bounces--;
               } else if((game.world.blocks[x][y][z] >> 8) != 0 && this.vx < 0) {
                   //this.mesh.position.x -= game.world.blockSize; 
                   this.mesh.rotation.set(0,0,0);
                   this.vx *= this.e;
                   this.bounces--;
               } else if((game.world.blocks[x][y][z] >> 8) != 0 && this.vz < 0) {
                   //this.mesh.position.z -= game.world.blockSize*8; 
                   this.mesh.rotation.set(0,0,0);
                   this.vz *= this.e; 
                   this.bounces--;
               } else if((game.world.blocks[x][y][z] >> 8) != 0 && this.vy < 0) {
                   this.mesh.position.y = y+game.world.blockSize*4; 
                   this.mesh.rotation.set(0,0,0);
                   this.vy *= this.e; 
                   this.bounces--;
               }
           }
       }
    };
};

function Phys() {
    this.blocks = new Array();
    this.meshes = new Array(); // TBD: Change name, actually chunks.
    this.size = 1500; // pool size for blocks.
    this.pos = 0;
    this.neg = 0;

    Phys.prototype.Init = function() {
        var b;
        for(var i = 0; i < this.size; i++) {
            b = new PhysBlock();
            b.Init();
            this.blocks.push(b);
        }
    };

    Phys.prototype.Draw = function(time, delta) {
        for(var i = 0; i < this.blocks.length; i++) {
            if(this.blocks[i].active == 1) {
                this.blocks[i].Draw(time,delta);
            }
        }
        for(var i = 0; i < this.meshes.length; i++) {
            if(this.meshes[i].remove == 1) {
                game.scene.remove(this.meshes[i].mesh);
                this.meshes.splice(i,1);
            } else {
                if(this.meshes[i].active == 1) {
                    this.meshes[i].Draw(time, delta);
                } else {
                    //game.scene.remove(this.meshes[i].mesh);
                    this.meshes.splice(i, 1);
                }
            }
        }
    };

    Phys.prototype.CreateMeshBlock = function(chunk) {
        var mb = new MeshBlock();
        mb.Create(chunk);
        this.meshes.push(mb);
    };

    Phys.prototype.Get = function() {
        for(var i = 0; i < this.blocks.length; i++) {
            if(this.blocks[i].active == 0) {
                this.blocks[i].active = 1;
                this.blocks[i].gravity = 9.82; // Reset gravity
                return this.blocks[i];
            }
        }
        return undefined;
    };

    Phys.prototype.Stats = function() {
        var free = 0;
        for(var i = 0; i < this.blocks.length; i++) {
            if(this.blocks[i].active == 0) {
                free++;
            }
        }
        return {"free": free, "total": this.size};
        
    };

}
